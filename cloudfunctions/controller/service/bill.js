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
    // 如果查询的是当前月份，则从今天开始，否则从月底开始
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

  // 计算月份的开始和结束时间
  const monthStart = new Date(startYear, startMonth, 1)
  const monthEnd = new Date(startYear, startMonth + 1, 0)
  monthEnd.setHours(23, 59, 59, 999)

  const monthWhereClause = {
    $and: [{ datetime: { $gte: monthStart.getTime() } }, { datetime: { $lte: monthEnd.getTime() } }],
  }

  const {
    data: { total: totalBills },
  } = await models.bill.list({
    filter: { where: monthWhereClause },
    pageSize: 1,
    getCount: true,
  })

  let accumulatedBills = []
  const MIN_RECORDS = 20
  let loopCount = 0
  const MAX_LOOP = 31 // 一个月最多31天

  while (
    currentDate.getMonth() === startMonth && // 确保不出当前月份
    accumulatedBills.length < MIN_RECORDS &&
    accumulatedBills.length < totalBills &&
    loopCount < MAX_LOOP
  ) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const whereClause = {
      $and: [{ datetime: { $gte: dayStart.getTime() } }, { datetime: { $lte: dayEnd.getTime() } }],
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

  const allDataLoaded = accumulatedBills.length >= totalBills || currentDate.getMonth() !== startMonth

  return {
    data: accumulatedBills,
    items: totalBills,
    nextStartDate: allDataLoaded ? null : currentDate.toISOString().split('T')[0],
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
  getBillsByMonth,
  getBillsByIds,
  deleteBill,
}
