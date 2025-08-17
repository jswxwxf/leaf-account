const cloud = require('wx-server-sdk')
const { getCategoryIds } = require('./category.js')
const { getTagsByIds } = require('./tag.js')
const {
  updateAccount,
  parseMoney,
  populateTagsForBills,
  saveTransfer,
  saveBill: _saveBill,
} = require('./common.js')

const db = cloud.database()
const _ = db.command

/**
 * 保存账单（创建或更新），并同步更新账户余额。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBill(event, models) {
  const { bill } = event.body
  const { accountId } = event.query || {}

  if (!bill || !bill.category) {
    throw new Error('请求中缺少 bill 或 category 对象')
  }

  // 如果是转账或收转账，则调用专门的转账函数
  if (bill.category.name === '转账' || bill.category.name === '收转账') {
    return saveTransfer(event, models)
  }

  // 对于普通账单，开启独立事务
  const transaction = await db.startTransaction()
  try {
    const savedBill = await _saveBill(bill, accountId, models, transaction)
    await transaction.commit()
    return savedBill
  } catch (e) {
    await transaction.rollback()
    throw new Error(`保存账单失败: ${e.message}`)
  }
}

/**
 * 批量保存账单。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBills(event, models) {
  const { bills } = event.body
  const { accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  if (!Array.isArray(bills) || bills.length === 0) {
    throw new Error('请求中缺少 bills 数组')
  }

  const BATCH_SIZE = 20 // 设置每批保存的数量
  const allBillIds = []

  // 将账单分块
  for (let i = 0; i < bills.length; i += BATCH_SIZE) {
    const batch = bills.slice(i, i + BATCH_SIZE)
    const billsToSave = batch.map((bill) => {
      const { datetime, category, amount } = bill
      const note = bill.note?.trim()
      if (!datetime || !category || !amount || note === undefined || note === null) {
        throw new Error('参数不合法，datetime, category, amount, note 不能为空')
      }
      const billToSave = { ...bill, note, amount: parseMoney(bill.amount) }
      // 确保金额正负与类别匹配
      if (billToSave.category?.type === '10' && billToSave.amount < 0) {
        billToSave.amount = -billToSave.amount
      } else if (billToSave.category?.type === '20' && billToSave.amount > 0) {
        billToSave.amount = -billToSave.amount
      }
      delete billToSave._id
      billToSave.category = billToSave.category?._id
      if (Array.isArray(billToSave.tags)) {
        billToSave.tags = billToSave.tags.map((tag) => tag._id).filter(Boolean)
      }
      return billToSave
    })

    const categoryIds = [...new Set(billsToSave.map((bill) => bill.category).filter((id) => id))]

    const balanceIncrement = parseMoney(billsToSave.reduce((sum, bill) => sum + bill.amount, 0))
    const incomeIncrement = parseMoney(
      billsToSave.reduce((sum, bill) => sum + (bill.amount > 0 ? bill.amount : 0), 0),
    )
    const expenseIncrement = parseMoney(
      billsToSave.reduce((sum, bill) => sum + (bill.amount < 0 ? bill.amount : 0), 0),
    )

    const transaction = await db.startTransaction()
    try {
      // 1. 更新账户余额
      if (balanceIncrement !== 0) {
        await updateAccount(
          {
            query: { accountId },
            body: { balanceIncrement, incomeIncrement, expenseIncrement },
          },
          models,
          transaction,
        )
      }

      // 2. 串行创建账单
      const newBillIds = []
      for (const bill of billsToSave) {
        const result = await transaction.collection('bill').add({
          data: {
            ...bill,
            account: accountId,
            _openid: OPENID,
            createdAt: Date.now(),
            createdBy: OPENID,
            updatedAt: Date.now(),
            updatedBy: OPENID,
          },
        })
        newBillIds.push(result._id)
      }

      if (newBillIds.some((id) => !id)) {
        throw new Error('部分账单创建失败')
      }

      allBillIds.push(...newBillIds)

      if (categoryIds.length > 0) {
        await transaction
          .collection('category')
          .where({
            _id: _.in(categoryIds),
          })
          .update({
            data: {
              usedAt: Date.now(),
            },
          })
      }

      // 3. 提交事务
      await transaction.commit()
    } catch (e) {
      await transaction.rollback()
      throw new Error(`批量保存账单失败: ${e.message}`)
    }
  }

  // 4. 获取所有新创建的账单详情
  const newBills = await getBillsByIds({ query: { ids: allBillIds } }, models)
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
  const { OPENID } = cloud.getWXContext()

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
      tags: true,
      createdAt: true,
    },
    filter: {
      where: {
        $and: [
          { _id: { $in: ids } },
          {
            _openid: { $eq: OPENID },
          },
        ],
      },
    },
  })

  return populateTagsForBills(bills, models)
}

/**
 * 根据月份获取账单总计
 * @param {object} event - 云函数的原始 event 对象
 */
async function getBillsSummary(event, models) {
  const { month, type, accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  // 权限：只能获取自己的或公共的
  const whereClause = {
    $and: [{ _openid: { $eq: OPENID } }, { account: { $eq: accountId } }],
  }

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

  const summary = aggregateResult.list[0] || { totalIncome: 0, totalExpense: 0 }

  return {
    totalIncome: parseMoney(summary.totalIncome),
    totalExpense: parseMoney(summary.totalExpense),
  }
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
  const { month, type, startDate: startDateStr, accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  // 权限：只能获取自己的或公共的
  const where = {
    $and: [
      {
        _openid: { $eq: OPENID },
      },
      {
        account: { $eq: accountId },
      },
    ],
  }
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

  const MIN_RECORDS = 20
  const FETCH_WINDOW_DAYS = 7
  const MAX_LOOP = 30 // 设置一个合理的循环上限以避免意外的死循环
  let accumulatedBills = []
  let loopCount = 0
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
    periodStart.setDate(periodStart.getDate() - (FETCH_WINDOW_DAYS - 1)) // 设置 FETCH_WINDOW_DAYS 天的时间窗口
    periodStart.setHours(0, 0, 0, 0)

    // 如果计算出的周期开始时间早于最早记录时间，则调整为最早记录时间，并标记这是最后一个周期
    if (periodStart.getTime() < minDate.getTime()) {
      periodStart.setTime(minDate.getTime())
      // 确保从一天的开始计算
      periodStart.setHours(0, 0, 0, 0)
      hasReachedEnd = true
    }

    const periodWhereClause = {
      $and: [
        // 使用展开运算符合并外部查询条件
        ...(where.$and || []),
        { datetime: { $gte: periodStart.getTime() } },
        { datetime: { $lte: periodEnd.getTime() } },
      ],
    }

    const {
      data: { records: periodBills },
    } = await models.bill.list({
      select: {
        _id: true,
        amount: true,
        datetime: true,
        note: true,
        category: { _id: true, name: true, type: true },
        tags: true,
        createdAt: true,
      },
      filter: { where: periodWhereClause },
      orderBy: [{ datetime: 'desc' }],
      pageSize: 1000, // 假设一周内账单不会超过1000条
    })

    if (periodBills && periodBills.length > 0) {
      accumulatedBills = accumulatedBills.concat(periodBills)
    }

    // 如果已经到达包含最早记录的最后一个周期，则退出循环
    if (hasReachedEnd) {
      break
    }

    // 准备下一个 FETCH_WINDOW_DAYS 天周期的迭代
    currentDate.setDate(currentDate.getDate() - FETCH_WINDOW_DAYS)
    loopCount++
  }

  const populatedBills = await populateTagsForBills(accumulatedBills, models)
  return {
    data: populatedBills,
    nextStartDate: hasReachedEnd ? null : currentDate.toISOString().split('T')[0],
  }
}

/**
 * 获取所有账单（不分页）
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getAllBills(event, models) {
  const { type, createdAt, accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  const where = {
    $and: [
      {
        _openid: { $eq: OPENID },
      },
      {
        account: { $eq: accountId },
      },
    ],
  }

  if (type) {
    const categoryIds = await getCategoryIds({ query: { type } }, models)
    if (categoryIds.length > 0) {
      where.$and.push({ category: { $in: categoryIds } })
    } else {
      return [] // 如果没有找到该类型的分类，直接返回空数组
    }
  }

  // 根据 createdDate 计算时间范围
  if (createdAt) {
    const startDate = new Date(createdAt)
    startDate.setHours(0, 0, 0, 0) // 设置为当天的开始

    const endDate = new Date(createdAt)
    endDate.setHours(23, 59, 59, 999) // 设置为当天的结束

    where.$and.push(
      { createdAt: { $gte: startDate.getTime() } },
      { createdAt: { $lte: endDate.getTime() } },
    )
  }

  const {
    data: { records },
  } = await models.bill.list({
    select: {
      _id: true,
      amount: true,
      datetime: true,
      note: true,
      category: { _id: true, name: true, type: true },
      tags: true,
      createdAt: true,
    },
    filter: { where },
    orderBy: [{ datetime: 'desc' }],
    pageSize: 1000, // 设置一个较大的数值以获取所有记录
  })

  return populateTagsForBills(records, models)
}

/**
 * 删除账单，并同步更新账户余额。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function deleteBill(event, models) {
  const { id } = event
  const { accountId } = event.query || {}
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

    // 权限校验：确保用户只能删除自己的账单
    if (billToDelete._openid && billToDelete._openid !== OPENID) {
      // 禁止删除，但为了不给恶意用户提示，静默处理
      await transaction.commit() // 提交空事务
      return false // 返回失败
    }
    const amountToDelete = billToDelete.amount

    // 2. 计算反向增量
    const balanceIncrement = parseMoney(-amountToDelete)
    const incomeIncrement = parseMoney(amountToDelete > 0 ? -amountToDelete : 0)
    const expenseIncrement = parseMoney(amountToDelete < 0 ? -amountToDelete : 0)

    // 3. 反向更新账户余额
    await updateAccount(
      {
        query: { accountId },
        body: { balanceIncrement, incomeIncrement, expenseIncrement },
      },
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
 * 清空当前用户的所有账单及公共账单，并重置账户。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function resetBills(event, models) {
  const { OPENID } = cloud.getWXContext()
  const transaction = await db.startTransaction()

  try {
    // 1. 删除所有相关账单
    const deleteResult = await transaction.collection('bill').where({ _openid: OPENID }).remove()

    // 2. 删除所有账户
    await transaction.collection('account').where({ _openid: OPENID }).remove()

    // 3. 删除所有用户自定义分类
    await transaction.collection('category').where({ _openid: OPENID }).remove()

    // 4. 删除所有用户自定义标签
    await transaction.collection('tag').where({ _openid: OPENID }).remove()

    await transaction.commit()
    return {
      deleted: deleteResult.stats.removed,
    }
  } catch (e) {
    await transaction.rollback()
    throw new Error(`重置账目失败: ${e.message}`)
  }
}

module.exports = {
  saveBill,
  saveBills,
  getBillsSummary,
  getBills,
  getAllBills,
  getBillsByIds,
  deleteBill,
  resetBills,
}
