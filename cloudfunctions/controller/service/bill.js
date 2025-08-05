const cloud = require('wx-server-sdk')
const { getCategoryIds } = require('./category.js')
const { updateAccount } = require('./account.js')

const db = cloud.database()
const _ = db.command

/**
 * 保存账单（创建或更新），并同步更新账户余额。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBill(event, models) {
  const { bill } = event.body
  const { OPENID } = cloud.getWXContext()

  if (!bill) {
    throw new Error('请求中缺少 bill 对象')
  }

  const originalBill = { ...bill } // 保留原始账单对象用于返回
  const billToSave = { ...bill }

  // 如果是支出，确保 amount 是负数
  if (billToSave.category?.type === '20' && billToSave.amount > 0) {
    billToSave.amount = -billToSave.amount
  }

  billToSave.category = billToSave.category?._id

  // 启动数据库事务
  const transaction = await db.startTransaction()
  try {
    let savedBill

    if (billToSave._id) {
      // --- 更新逻辑 ---
      const billId = billToSave._id
      delete billToSave._id

      // 1. 获取旧账单信息以计算差额
      const oldBillRes = await transaction.collection('bill').doc(billId).get()
      if (!oldBillRes.data) {
        throw new Error(`找不到 ID 为 ${billId} 的账单`)
      }
      const oldBill = oldBillRes.data
      const newBill = billToSave

      const balanceIncrement = newBill.amount - oldBill.amount
      const incomeIncrement =
        (newBill.amount > 0 ? newBill.amount : 0) - (oldBill.amount > 0 ? oldBill.amount : 0)
      const expenseIncrement =
        (newBill.amount < 0 ? newBill.amount : 0) - (oldBill.amount < 0 ? oldBill.amount : 0)

      // 2. 更新账户余额
      await updateAccount(
        { balanceIncrement, incomeIncrement, expenseIncrement },
        models,
        transaction,
      )

      // 3. 更新账单
      await transaction.collection('bill').doc(billId).update({ data: newBill })
      savedBill = { ...originalBill, _id: billId }
    } else {
      // --- 新增逻辑 ---
      const balanceIncrement = billToSave.amount
      const incomeIncrement = balanceIncrement > 0 ? balanceIncrement : 0
      const expenseIncrement = balanceIncrement < 0 ? balanceIncrement : 0

      // 1. 更新账户余额
      await updateAccount(
        { balanceIncrement, incomeIncrement, expenseIncrement },
        models,
        transaction,
      )

      // 2. 创建新账单
      const createResult = await transaction.collection('bill').add({ data: billToSave })
      if (!createResult._id) {
        throw new Error('创建新账单失败')
      }
      savedBill = { ...originalBill, _id: createResult._id }
    }

    // 提交事务
    await transaction.commit()
    return savedBill
  } catch (e) {
    // 回滚事务
    await transaction.rollback()
    // 抛出错误以便上层捕获
    throw new Error(`保存账单失败: ${e.message}`)
  }
}

/**
 * 根据月份获取账单总计
 * @param {object} event - 云函数的原始 event 对象
 */
async function getBillsSummary(event, models) {
  const { month, type } = event.query || {}
  const whereClause = { $and: [] }

  if (month) {
    const [year, monthNum] = month.split('-').map(Number)
    const monthStart = new Date(year, monthNum - 1, 1)
    const monthEnd = new Date(year, monthNum, 0)
    monthEnd.setHours(23, 59, 59, 999)

    whereClause.$and.push(
      { datetime: { $gte: monthStart.getTime() } },
      { datetime: { $lte: monthEnd.getTime() } },
    )
  }

  if (type) {
    const categoryIds = await getCategoryIds({ query: { type } }, models)

    if (categoryIds.length > 0) {
      whereClause.$and.push({ category: { $in: categoryIds } })
    } else {
      // 如果没有找到该类型的分类，直接返回空
      return { totalIncome: 0, totalExpense: 0 }
    }
  }

  // 如果没有有效过滤条件，则移除 $and
  if (whereClause.$and.length === 0) {
    delete whereClause.$and
  }

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
  const { month, type, startDate: startDateStr } = event.query || {}

  const where = { $and: [] }
  let currentDate

  if (month) {
    const [year, monthNum] = month.split('-').map(Number)
    const monthStart = new Date(year, monthNum - 1, 1)
    const monthEnd = new Date(year, monthNum, 0)
    monthEnd.setHours(23, 59, 59, 999)
    where.$and.push(
      { datetime: { $gte: monthStart.getTime() } },
      { datetime: { $lte: monthEnd.getTime() } },
    )

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

  if (type) {
    const categoryIds = await getCategoryIds({ query: { type } }, models)

    if (categoryIds.length > 0) {
      where.$and.push({ category: { $in: categoryIds } })
    } else {
      // 如果没有找到该类型的分类，直接返回空结果
      return { data: [], nextStartDate: null }
    }
  }

  if (where.$and.length === 0) {
    delete where.$and
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
      $and: [
        // 使用展开运算符合并外部查询条件
        ...(where.$and || []),
        { datetime: { $gte: periodStart.getTime() } },
        { datetime: { $lte: periodEnd.getTime() } },
      ],
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
 * 删除账单，并同步更新账户余额。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function deleteBill(event, models) {
  const { id } = event
  const { OPENID } = cloud.getWXContext()

  if (!id) {
    throw new Error('请求中缺少 id 参数')
  }

  const transaction = await db.startTransaction()
  try {
    // 1. 获取要删除的账单信息
    const billRes = await transaction.collection('bill').doc(id).get()
    if (!billRes.data) {
      // 如果账单不存在，可能已经被删除，直接提交事务并认为操作成功
      await transaction.commit()
      return true
    }
    const billToDelete = billRes.data
    const amountToDelete = billToDelete.amount

    // 2. 计算反向增量
    const balanceIncrement = -amountToDelete
    const incomeIncrement = amountToDelete > 0 ? -amountToDelete : 0
    const expenseIncrement = amountToDelete < 0 ? -amountToDelete : 0

    // 3. 反向更新账户余额
    await updateAccount(
      { balanceIncrement, incomeIncrement, expenseIncrement },
      models,
      transaction,
    )

    // 4. 删除账单
    const deleteResult = await transaction.collection('bill').doc(id).remove()
    if (deleteResult.stats.removed === 0) {
      throw new Error('删除账单失败')
    }

    // 提交事务
    await transaction.commit()
    return true
  } catch (e) {
    await transaction.rollback()
    throw new Error(`删除账单失败: ${e.message}`)
  }
}

/**
 * 批量保存账单。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBills(event, models) {
  const { bills } = event.body
  const { OPENID } = cloud.getWXContext()

  if (!Array.isArray(bills) || bills.length === 0) {
    throw new Error('请求中缺少 bills 数组')
  }

  const billsToSave = bills.map((bill) => {
    const billToSave = { ...bill }
    if (billToSave.category?.type === '20' && billToSave.amount > 0) {
      billToSave.amount = -billToSave.amount
    }
    delete billToSave._id
    billToSave.category = billToSave.category?._id
    return billToSave
  })

  const balanceIncrement = billsToSave.reduce((sum, bill) => sum + bill.amount, 0)
  const incomeIncrement = billsToSave.reduce(
    (sum, bill) => sum + (bill.amount > 0 ? bill.amount : 0),
    0,
  )
  const expenseIncrement = billsToSave.reduce(
    (sum, bill) => sum + (bill.amount < 0 ? bill.amount : 0),
    0,
  )

  const transaction = await db.startTransaction()
  try {
    // 1. 更新账户余额
    if (balanceIncrement !== 0) {
      await updateAccount(
        { balanceIncrement, incomeIncrement, expenseIncrement },
        models,
        transaction,
      )
    }

    // 2. 批量创建账单
    const addPromises = billsToSave.map((bill) =>
      transaction.collection('bill').add({ data: bill }),
    )
    const addResults = await Promise.all(addPromises)
    const newBillIds = addResults.map((res) => res._id)

    if (newBillIds.some((id) => !id)) {
      throw new Error('部分账单创建失败')
    }

    // 3. 提交事务
    await transaction.commit()

    // 4. 获取新创建的账单详情
    const newBills = await getBillsByIds({ query: { ids: newBillIds } }, models)
    return newBills
  } catch (e) {
    await transaction.rollback()
    throw new Error(`批量保存账单失败: ${e.message}`)
  }
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
