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
async function getBillsSummary(event) {
  const { month } = event.query || {}
  let whereClause = {}

  if (month) {
    const [year, monthNum] = month.split('-').map(Number)
    const monthStart = new Date(year, monthNum - 1, 1)
    const monthEnd = new Date(year, monthNum, 0)
    monthEnd.setHours(23, 59, 59, 999)

    whereClause = {
      $and: [
          { datetime: { $gte: monthStart.getTime() } },
          { datetime: { $lte: monthEnd.getTime() } },
      ]
    }
  }

  const _ = db.command
  const $ = _.aggregate

  const aggregateResult = await db
    .collection('bill')
    .aggregate()
    .match(whereClause)
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
async function getBills(event, models) {
  const { month, startDate: startDateStr } = event.query || {}

  let where = {}
  let currentDate

  if (month) {
    const [year, monthNum] = month.split('-').map(Number)
    const monthStart = new Date(year, monthNum - 1, 1)
    const monthEnd = new Date(year, monthNum, 0)
    monthEnd.setHours(23, 59, 59, 999)
    where = {
      $and: [
        { datetime: { $gte: monthStart.getTime() } },
        { datetime: { $lte: monthEnd.getTime() } },
      ],
    }

    // 如果是当月，从今天开始，否则从月底开始
    const today = new Date()
    if (year === today.getFullYear() && monthNum - 1 === today.getMonth()) {
      currentDate = startDateStr ? new Date(startDateStr) : today
    } else {
      currentDate = startDateStr ? new Date(startDateStr) : monthEnd
    }
  } else {
    currentDate = startDateStr ? new Date(startDateStr) : new Date()
  }

  const minDate = await getMinDate(models, where)

  if (!minDate) {
    return { data: [], nextStartDate: null }
  }

  let accumulatedBills = []
  const MIN_RECORDS = 20
  let loopCount = 0
  const MAX_LOOP = 30 // 设置一个合理的循环上限以避免意外的死循环
  let hasReachedEnd = false

  while (accumulatedBills.length < MIN_RECORDS && loopCount < MAX_LOOP) {
    const periodEnd = new Date(currentDate)
    periodEnd.setHours(23, 59, 59, 999)

    // 如果当前搜索周期的结束时间已经早于最早的记录时间，说明已经到底了
    if (periodEnd.getTime() < minDate.getTime()) {
      hasReachedEnd = true
      break
    }

    const periodStart = new Date(currentDate)
    periodStart.setDate(periodStart.getDate() - 6) // 设置7天的时间窗口
    periodStart.setHours(0, 0, 0, 0)

    // 如果计算出的周期开始时间早于最早记录时间，则调整为最早记录时间，并标记这是最后一个周期
    if (periodStart.getTime() < minDate.getTime()) {
      periodStart.setTime(minDate.getTime())
      // 确保从一天的开始计算
      periodStart.setHours(0, 0, 0, 0)
      hasReachedEnd = true
    }

    const weeklyWhereClause = {
      $and: [{ datetime: { $gte: periodStart.getTime() } }, { datetime: { $lte: periodEnd.getTime() } }],
    }

    const {
      data: { records: weeklyBills },
    } = await models.bill.list({
      select: {
        _id: true,
        amount: true,
        datetime: true,
        note: true,
        category: { _id: true, name: true, type: true },
        tags: { _id: true, name: true, type: true },
      },
      filter: { where: weeklyWhereClause },
      orderBy: [{ datetime: 'desc' }],
      pageSize: 1000, // 假设一周内账单不会超过1000条
    })

    if (weeklyBills && weeklyBills.length > 0) {
      accumulatedBills = accumulatedBills.concat(weeklyBills)
    }

    // 如果已经到达包含最早记录的最后一个周期，则退出循环
    if (hasReachedEnd) {
      break
    }

    // 准备下一个7天周期的迭代
    currentDate.setDate(currentDate.getDate() - 7)
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
  getBillsSummary,
  getBills,
  getBillsByIds,
  deleteBill,
}
