const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})
const db = cloud.database()

/**
 * 保存账单（创建或更新）。
 * 利用数据模型自动处理 category 和 tags 的关联。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBill(event, models) {
  const { bill } = event.body
  if (!bill) {
    throw new Error('请求中缺少 bill 对象')
  }

  const billToSave = { ...bill }

  // 如果是支出，确保 amount 是负数
  if (billToSave.category?.type === '20' && billToSave.amount > 0) {
    billToSave.amount = -billToSave.amount
  }

  if (billToSave._id) {
    // 更新逻辑
    const billId = billToSave._id
    delete billToSave._id
    await models.bill.update({
      data: billToSave,
      filter: {
        where: {
          _id: {
            $eq: billId, // 推荐传入_id数据标识进行操作
          },
        },
      },
    })
    // 更新成功后，返回完整的账单对象
    return { ...billToSave, _id: billId }
  } else {
    // 新增逻辑
    const createResult = await models.bill.create({
      data: billToSave,
    })
    const { id } = createResult.data
    // 创建成功后，返回带有新 _id 的完整账单对象
    return { ...billToSave, _id: id }
  }
}

/**
 * 根据月份获取账单总计
 * @param {object} event - 云函数的原始 event 对象
 */
async function getBillsSummaryByMonth(event) {
  const { startDate: dateStr } = event.query || {}

  const queryDate = dateStr ? new Date(dateStr) : new Date()
  const year = queryDate.getFullYear()
  const month = queryDate.getMonth()

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)

  const monthWhereClause = {
    $and: [
      { datetime: { $gte: monthStart.getTime() } },
      { datetime: { $lte: monthEnd.getTime() } },
    ],
  }

  const _ = db.command
  const $ = _.aggregate

  const aggregateResult = await db
    .collection('bill')
    .aggregate()
    .match(monthWhereClause)
    .group({
      _id: null,
      totalIncome: $.sum($.cond([$.gt(['$amount', 0]), '$amount', 0])),
      totalExpense: $.sum($.cond([$.lte(['$amount', 0]), '$amount', 0])),
    })
    .end()

  return aggregateResult.list[0] || { totalIncome: 0, totalExpense: 0 }
}

/**
 * 获取指定查询条件下的最小日期
 * @param {object} models - 数据模型实例
 * @param {object} where - 查询条件
 */
async function getMinDate(models, where = {}) {
  const res = await models.bill.list({
    filter: { where },
    orderBy: [{ datetime: 'asc' }],
    page: 1,
    pageSize: 1,
  })
  if (res.data && res.data.records.length > 0) {
    return new Date(res.data.records[0].datetime)
  }
  return null
}

/**
 * 获取账单列表
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getBillsByMonth(event, models) {
  const { startDate: startDateStr } = event.query || {}

  let currentDate
  if (startDateStr) {
    const today = new Date()
    const startDate = new Date(startDateStr)
    if (
      startDate.getFullYear() === today.getFullYear() &&
      startDate.getMonth() === today.getMonth()
    ) {
      currentDate = today
    } else {
      currentDate = startDate
    }
  } else {
    currentDate = new Date()
  }
  const startMonth = currentDate.getMonth()
  const startYear = currentDate.getFullYear()

  const monthStart = new Date(startYear, startMonth, 1)
  const monthEnd = new Date(startYear, startMonth + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)

  const monthWhereClause = {
    $and: [
      { datetime: { $gte: monthStart.getTime() } },
      { datetime: { $lte: monthEnd.getTime() } },
    ],
  }

  const minDateInMonth = await getMinDate(models, monthWhereClause)

  if (!minDateInMonth) {
    return { data: [], nextStartDate: null }
  }

  let accumulatedBills = []
  const MIN_RECORDS = 20
  let loopCount = 0
  const MAX_LOOP = 31 // 一个月最多循环31次
  let hasReachedEnd = false

  while (!hasReachedEnd && accumulatedBills.length < MIN_RECORDS && loopCount < MAX_LOOP) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    if (dayStart.getTime() < minDateInMonth.getTime()) {
      hasReachedEnd = true
      continue
    }

    const whereClause = {
      $and: [
        { datetime: { $gte: dayStart.getTime() } },
        { datetime: { $lte: dayEnd.getTime() } },
      ],
    }

    const {
      data: { records: dailyBills },
    } = await models.bill.list({
      select: {
        _id: true,
        amount: true,
        datetime: true,
        note: true,
        category: { _id: true, name: true, type: true },
        tags: { _id: true, name: true, type: true },
      },
      filter: { where: whereClause },
      orderBy: [{ datetime: 'desc' }],
      pageSize: 1000,
    })

    if (dailyBills && dailyBills.length > 0) {
      accumulatedBills = accumulatedBills.concat(dailyBills)
    }

    currentDate.setDate(currentDate.getDate() - 1)
    loopCount++
  }

  return {
    data: accumulatedBills,
    nextStartDate: hasReachedEnd ? null : currentDate.toISOString().split('T')[0],
  }
}

/**
 * 获取所有账单列表（分页）
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getBills(event, models) {
  const { startDate: startDateStr } = event.query || {}

  const minDate = await getMinDate(models)

  if (!minDate) {
    return { data: [], nextStartDate: null }
  }

  const currentDate = startDateStr ? new Date(startDateStr) : new Date()

  let accumulatedBills = []
  const MIN_RECORDS = 20
  let loopCount = 0
  const MAX_LOOP = 100 // 设置一个合理的循环上限以避免意外的死循环
  let hasReachedEnd = false

  while (!hasReachedEnd && accumulatedBills.length < MIN_RECORDS && loopCount < MAX_LOOP) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    if (dayStart.getTime() < minDate.getTime()) {
      hasReachedEnd = true
      continue
    }

    const whereClause = {
      $and: [
        { datetime: { $gte: dayStart.getTime() } },
        { datetime: { $lte: dayEnd.getTime() } },
      ],
    }

    const {
      data: { records: dailyBills },
    } = await models.bill.list({
      select: {
        _id: true,
        amount: true,
        datetime: true,
        note: true,
        category: { _id: true, name: true, type: true },
        tags: { _id: true, name: true, type: true },
      },
      filter: { where: whereClause },
      orderBy: [{ datetime: 'desc' }],
      pageSize: 1000,
    })

    if (dailyBills && dailyBills.length > 0) {
      accumulatedBills = accumulatedBills.concat(dailyBills)
    }

    currentDate.setDate(currentDate.getDate() - 1)
    loopCount++
  }

  return {
    data: accumulatedBills,
    nextStartDate: hasReachedEnd ? null : currentDate.toISOString().split('T')[0],
  }
}

/**
 * 删除账单。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function deleteBill(event, models) {
  const { id } = event
  if (!id) {
    throw new Error('请求中缺少 id 参数')
  }

  const result = await models.bill.delete({
    filter: {
      where: {
        _id: {
          $eq: id,
        },
      },
    },
  })

  if (result.data.count > 0) {
    return true
  }
  return false
}

/**
 * 批量保存账单。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBills(event, models) {
  const { bills } = event.body
  if (!Array.isArray(bills) || bills.length === 0) {
    throw new Error('请求中缺少 bills 数组')
  }

  const billsToSave = bills.map((bill) => {
    const billToSave = { ...bill }
    if (billToSave.category?.type === '20' && billToSave.amount > 0) {
      billToSave.amount = -billToSave.amount
    }
    delete billToSave._id
    return billToSave
  })

  const createResult = await models.bill.createMany({
    data: billsToSave,
  })

  const newBillIds = createResult.data.idList
  if (!newBillIds || newBillIds.length === 0) {
    return []
  }

  const newBills = await getBillsByIds({ query: { ids: newBillIds } }, models)
  return newBills
}

/**
 * 根据 ID 列表获取账单详情。
 * @param {string[]} ids - 账单 ID 数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<object[]>} - 完整的账单对象数组
 */
async function getBillsByIds(event, models) {
  const { ids } = event.query
  if (!ids || ids.length === 0) {
    return []
  }

  const {
    data: { records: bills },
  } = await models.bill.list({
    select: {
      _id: true,
      amount: true,
      datetime: true,
      note: true,
      category: { _id: true, name: true, type: true },
      tags: { _id: true, name: true, type: true },
    },
    filter: {
      where: {
        _id: { $in: ids },
      },
    },
  })
  return bills
}

module.exports = {
  saveBill,
  saveBills,
  getBillsSummaryByMonth,
  getBillsByMonth,
  getBills,
  getBillsByIds,
  deleteBill,
}
