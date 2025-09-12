const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')
const { getCategoryIds, getCategoriesByIds, populateCategoriesForBills } = require('./category.js')
const { getTagsByIds, populateTagsForBills } = require('./tag.js')
const { _updateAccount } = require('./account.js')
const { parseMoney } = require('./helper.js')

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

  // 判断是否为转账操作：
  // 1. 新建转账时，category.name 会是 '转账' 或 '收转账'
  // 2. 更新转账时，bill 会同时包含 _id 和 relatedBill
  const isTransfer =
    (bill.category && (bill.category.name === '转账' || bill.category.name === '收转账')) ||
    (bill._id && bill.relatedBill)

  // 如果不是转账，则必须有 category
  if (!isTransfer && !bill.category) {
    throw new Error('请求中缺少 category 对象')
  }

  const transaction = await db.startTransaction()
  try {
    let savedBill
    if (isTransfer) {
      savedBill = await _saveTransfer(event, models, transaction)
    } else {
      // _saveBill (in helper.js) 会负责从 bill.category 对象中提取 ID 并存入数据库
      savedBill = await _saveBill(bill, accountId, models, transaction)
    }
    await transaction.commit()
    return savedBill
  } catch (e) {
    await transaction.rollback()
    throw e
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

  if (!Array.isArray(bills) || bills.length === 0) {
    throw new Error('请求中缺少 bills 数组')
  }

  const BATCH_SIZE = 3
  const allSavedBills = []

  for (let i = 0; i < bills.length; i += BATCH_SIZE) {
    const batch = bills.slice(i, i + BATCH_SIZE)
    const transaction = await db.startTransaction()
    try {
      // 调用 helper 函数处理单个批次
      const savedBillsInBatch = await _saveBills(batch, accountId, models, transaction)
      await transaction.commit()
      allSavedBills.push(...savedBillsInBatch)
    } catch (e) {
      await transaction.rollback()
      // 如果任何一个批次失败，则抛出错误并终止整个过程
      throw new Error(`批量保存失败于批次 ${i / BATCH_SIZE + 1}: ${e.message}`)
    }
  }
  return allSavedBills
}

/**
 * 根据 ID 列表获取账单详情。
 * @param {string[]} ids - 账单 ID 数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<object[]>} - 完整的账单对象数组
 */
async function getBillsByIds(event, models, dbOrTransaction) {
  return _getBillsByIds(event, models, dbOrTransaction)
}

/**
 * 根据 ID 列表获取账单详情。
 * @param {string[]} ids - 账单 ID 数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<object[]>} - 完整的账单对象数组
 */

async function _getBillsByIds(event, models, dbOrTransaction) {
  const { ids } = event.query
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!ids || ids.length === 0) {
    return []
  }

  const billCollection = dbInstance.collection('bill')
  const { data: bills } = await billCollection
    .where({
      _id: _.in(ids),
      _openid: OPENID,
    })
    .get()

  if (!bills || bills.length === 0) {
    return []
  }

  const billsWithCategory = await populateCategoriesForBills(bills, models)
  return populateTagsForBills(billsWithCategory, models)
}

async function buildBillQuery(event, models) {
  const {
    accountId,
    startTime,
    endTime,
    type,
    categories,
    minAmount,
    maxAmount,
    note,
    tags,
    createdAt,
  } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  const where = {
    $and: [{ _openid: { $eq: OPENID } }],
  }

  if (accountId) {
    where.$and.push({ account: { $eq: accountId } })
  }

  if (startTime && endTime) {
    where.$and.push({ datetime: { $gte: startTime } }, { datetime: { $lte: endTime } })
  }

  // 同时处理 type 和 categories
  if (type) {
    const categoryIds = await getCategoryIds({ query: { type } }, models)
    if (categoryIds.length > 0) {
      where.$and.push({ category: { $in: categoryIds } })
    } else {
      // 如果按类型筛选但没有匹配的分类，则返回一个特殊标志
      return { ...where, noMatch: true }
    }
  } else if (categories && categories.length > 0) {
    where.$and.push({ category: { $in: categories } })
  }

  // 处理金额范围
  if (minAmount !== undefined) {
    where.$and.push({ amount: _.gte(parseFloat(minAmount)) })
  }
  if (maxAmount !== undefined) {
    where.$and.push({ amount: _.lte(parseFloat(maxAmount)) })
  }

  // 处理备注
  if (note) {
    where.$and.push({
      note: db.RegExp({
        regexp: note.trim(),
        options: 'i',
      }),
    })
  }

  // 处理标签
  if (tags && tags.length > 0) {
    where.$and.push({ tags: { $in: tags } })
  }

  // 处理创建时间
  if (createdAt) {
    const startDate = dayjs(createdAt).startOf('day').valueOf()
    const endDate = dayjs(createdAt).endOf('day').valueOf()
    where.$and.push({ createdAt: { $gte: startDate } }, { createdAt: { $lte: endDate } })
  }

  return where
}

/**
 * 根据月份获取账单总计
 * @param {object} event - 云函数的原始 event 对象
 */
async function getBillsSummary(event, models) {
  const { minAmount, maxAmount, exclude = true } = event.query || {}
  const whereClause = await buildBillQuery(event, models)

  if (whereClause.noMatch) {
    return { totalIncome: 0, totalExpense: 0 }
  }

  // 移除对 amount 的过滤，因为它会影响聚合计算
  const filteredAnd = whereClause.$and.filter((cond) => !cond.amount)
  const matchClause = { ...whereClause, $and: filteredAnd }

  const $ = _.aggregate

  // 构建金额范围的条件
  const amountConditions = []
  if (minAmount !== undefined) {
    amountConditions.push($.gte(['$amount', parseFloat(minAmount)]))
  }
  if (maxAmount !== undefined) {
    amountConditions.push($.lte(['$amount', parseFloat(maxAmount)]))
  }
  const isAmountInRange = amountConditions.length > 0 ? $.and(amountConditions) : true

  const aggregate = db.collection('bill').aggregate().match(matchClause)

  // 附加过滤条件：非日常
  if (exclude === false) {
    const { data: excludedTags } = await db
      .collection('tag')
      .where({ name: '非日常' })
      .field({ _id: true })
      .get()
    const excludedTagIds = excludedTags.map((t) => t._id)
    if (excludedTagIds.length > 0) {
      aggregate.match({ tags: _.nin(excludedTagIds) })
    }
  }

  const aggregateResult = await aggregate
    .group({
      _id: null,
      totalIncome: $.sum($.cond([$.and([$.gt(['$amount', 0]), isAmountInRange]), '$amount', 0])),
      totalExpense: $.sum($.cond([$.and([$.lte(['$amount', 0]), isAmountInRange]), '$amount', 0])),
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
  const res = await db.collection('bill').where(where).orderBy('datetime', 'asc').limit(1).get()

  if (res.data && res.data.length > 0) {
    return res.data[0].datetime
  }
  return null
}

/**
 * 获取账单列表
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getBills(event, models) {
  const { startTime, endTime, startDate: startDateTs } = event.query || {}
  const where = await buildBillQuery(event, models)

  if (where.noMatch) {
    return { data: [], nextStartDate: null }
  }

  const minDateTs = await getMinDate(models, where)
  if (!minDateTs) {
    return { data: [], nextStartDate: null }
  }

  let currentDateTs
  if (startTime && endTime) {
    currentDateTs = startDateTs || endTime
  } else {
    currentDateTs = startDateTs || Date.now()
  }

  const MIN_RECORDS = 20
  const FETCH_WINDOW_DAYS = 7
  const MAX_LOOP = 30
  let accumulatedBills = []
  let loopCount = 0
  let hasReachedEnd = false
  const $ = _.aggregate

  while (accumulatedBills.length < MIN_RECORDS && loopCount < MAX_LOOP) {
    const periodEndDate = dayjs(currentDateTs).endOf('day')

    if (periodEndDate.valueOf() < minDateTs) {
      hasReachedEnd = true
      break
    }

    const periodStartDate = dayjs(currentDateTs)
      .subtract(FETCH_WINDOW_DAYS - 1, 'day')
      .startOf('day')

    let finalPeriodStartTs = periodStartDate.valueOf()
    if (finalPeriodStartTs < minDateTs) {
      finalPeriodStartTs = dayjs(minDateTs).startOf('day').valueOf()
      hasReachedEnd = true
    }

    const periodWhereClause = {
      $and: [
        ...(where.$and || []),
        { datetime: { $gte: finalPeriodStartTs } },
        { datetime: { $lte: periodEndDate.valueOf() } },
      ],
    }

    const { list: periodBills } = await db
      .collection('bill')
      .aggregate()
      .match(periodWhereClause)
      .sort({ datetime: -1 })
      .lookup({
        from: 'category',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryInfo',
      })
      .lookup({
        from: 'tag',
        localField: 'tags',
        foreignField: '_id',
        as: 'tagsInfo',
      })
      .project({
        _id: 1,
        amount: 1,
        datetime: 1,
        note: 1,
        createdAt: 1,
        relatedBill: 1,
        category: $.arrayElemAt(['$categoryInfo', 0]),
        tags: '$tagsInfo',
      })
      .limit(1000)
      .end()

    if (periodBills && periodBills.length > 0) {
      accumulatedBills = accumulatedBills.concat(periodBills)
    }

    if (hasReachedEnd) {
      break
    }

    currentDateTs = dayjs(currentDateTs).subtract(FETCH_WINDOW_DAYS, 'day').valueOf()
    loopCount++
  }

  const { exclude = true } = event.query || {}
  let finalBills = accumulatedBills

  if (exclude === false) {
    finalBills = accumulatedBills.filter((bill) => {
      if (!bill.tags || bill.tags.length === 0) {
        return true
      }
      // 直接通过 $lookup 填充的 tags 数组查找 name 属性
      return !bill.tags.some((tag) => tag.name === '非日常')
    })
  }

  return {
    data: finalBills,
    nextStartDate: hasReachedEnd ? null : currentDateTs,
  }
}

/**
 * 获取所有账单（不分页）
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getAllBills(event, models) {
  const where = await buildBillQuery(event, models)

  if (where.noMatch) {
    return []
  }

  const $ = _.aggregate
  const { list: data } = await db
    .collection('bill')
    .aggregate()
    .match(where)
    .sort({ datetime: -1 })
    .limit(1000)
    .lookup({
      from: 'category',
      localField: 'category',
      foreignField: '_id',
      as: 'categoryInfo',
    })
    .lookup({
      from: 'tag',
      localField: 'tags',
      foreignField: '_id',
      as: 'tagsInfo',
    })
    .project({
      _id: 1,
      amount: 1,
      datetime: 1,
      note: 1,
      createdAt: 1,
      relatedBill: 1,
      category: $.arrayElemAt(['$categoryInfo', 0]),
      tags: '$tagsInfo',
    })
    .end()

  return data
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
    const billRes = await transaction.collection('bill').doc(id).get()
    if (!billRes.data) {
      await transaction.commit()
      return true
    }
    const billToDelete = billRes.data

    if (billToDelete._openid && billToDelete._openid !== OPENID) {
      await transaction.commit()
      return false
    }

    const amountToDelete = billToDelete.amount
    await _updateAccount(
      {
        query: { accountId },
        body: {
          balanceIncrement: parseMoney(-amountToDelete),
          incomeIncrement: parseMoney(amountToDelete > 0 ? -amountToDelete : 0),
          expenseIncrement: parseMoney(amountToDelete < 0 ? amountToDelete : 0),
        },
      },
      models,
      transaction,
    )
    await transaction.collection('bill').doc(id).remove()

    if (billToDelete.relatedBill) {
      const relatedBillRes = await transaction
        .collection('bill')
        .doc(billToDelete.relatedBill)
        .get()
      if (relatedBillRes.data) {
        const relatedBill = relatedBillRes.data
        const relatedAmount = relatedBill.amount
        const relatedAccountId = relatedBill.account

        if (relatedBill._openid && relatedBill._openid !== OPENID) {
          throw new Error('没有权限删除关联账单')
        }

        await _updateAccount(
          {
            query: { accountId: relatedAccountId },
            body: {
              balanceIncrement: parseMoney(-relatedAmount),
              incomeIncrement: parseMoney(relatedAmount > 0 ? -relatedAmount : 0),
              expenseIncrement: parseMoney(relatedAmount < 0 ? relatedAmount : 0),
            },
          },
          models,
          transaction,
        )
        await transaction.collection('bill').doc(billToDelete.relatedBill).remove()
      }
    }

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
    const deleteResult = await transaction.collection('bill').where({ _openid: OPENID }).remove()
    await transaction.collection('account').where({ _openid: OPENID }).remove()
    await transaction.collection('category').where({ _openid: OPENID }).remove()
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

async function saveTransfer(event, models) {
  const { targetAccount, amount, type } = event.body
  const { accountId } = event.query || {}

  if (!targetAccount || !amount || !type || !accountId) {
    throw new Error('参数不完整：targetAccount, amount, type, accountId 都是必需的')
  }

  const { data: categories } = await models.category.list({
    filter: {
      where: {
        name: { $in: ['转账', '收转账'] },
        _openid: { $empty: true },
      },
    },
  })

  const transferOutCategory = categories.records.find((c) => c.name === '转账')
  const transferInCategory = categories.records.find((c) => c.name === '收转账')

  if (!transferOutCategory || !transferInCategory) {
    throw new Error('找不到内置的转账分类')
  }

  const category = type === 20 ? transferOutCategory : transferInCategory
  category.account = targetAccount

  const bill = {
    category,
    amount,
    datetime: Date.now(),
    note: '',
  }

  const eventForCommon = {
    ...event,
    body: { bill },
    query: { accountId },
  }

  return _saveTransfer(eventForCommon, models)
}

/**
 * 批量删除账单，并同步更新所有相关账户的余额。
 * @param {object} event - 包含 billsToDelete 的事件对象
 * @param {object} models - 数据模型实例
 * @param {object} transaction - 外部事务对象
 */
async function deleteBills(event, models) {
  const transaction = await db.startTransaction()
  try {
    const result = await _deleteBills(event, models, transaction)
    await transaction.commit()
    return result
  } catch (e) {
    await transaction.rollback()
    throw e // 将 helper.js 中抛出的原始错误继续向上抛出
  }
}

/**
 * 批量更新账单。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function updateBills(event, models) {
  const { ids, accountId } = event.query
  const data = event.body
  const { OPENID } = cloud.getWXContext()

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new Error('缺少账单 ID')
  }
  if (!data || Object.keys(data).length === 0) {
    throw new Error('缺少更新数据')
  }

  const transaction = await db.startTransaction()
  try {
    // 准备更新数据
    const updateData = { ...data, updatedAt: Date.now() }
    if (updateData.category && typeof updateData.category === 'object') {
      updateData.category = updateData.category._id
    }
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = updateData.tags.map((tag) => (typeof tag === 'object' ? tag._id : tag))
    }
    delete updateData.relatedBill // 确保不更新关联账单字段

    // 如果更新了金额，需要处理账户余额
    if (updateData.amount !== undefined) {
      const oldBills = await _getBillsByIds({ query: { ids } }, models, transaction)
      if (oldBills.length !== ids.length) {
        throw new Error('部分账单不存在或无权限操作')
      }

      // 确保所有待更新账单都不是转账账单
      if (oldBills.some((bill) => bill.relatedBill)) {
        throw new Error('不能批量更新包含转账的账单金额')
      }

      let newAmount = Math.abs(parseFloat(updateData.amount))
      if (data.category && typeof data.category === 'object') {
        if (data.category.type === '20') newAmount = -newAmount
      } else if (oldBills.length > 0) {
        if (oldBills[0].amount < 0) newAmount = -newAmount
      }
      updateData.amount = newAmount

      const oldTotalAmount = oldBills.reduce((sum, bill) => sum + bill.amount, 0)
      const newTotalAmount = newAmount * oldBills.length
      const diff = newTotalAmount - oldTotalAmount

      let incomeIncrement = 0
      let expenseIncrement = 0
      if (diff > 0) {
        incomeIncrement = diff
      } else {
        expenseIncrement = -diff
      }

      await _updateAccount(
        {
          query: { accountId },
          body: {
            balanceIncrement: parseMoney(diff),
            incomeIncrement: parseMoney(incomeIncrement),
            expenseIncrement: parseMoney(expenseIncrement),
          },
        },
        models,
        transaction,
      )
    }

    // 批量更新账单
    const result = await transaction
      .collection('bill')
      .where({
        _id: _.in(ids),
        _openid: OPENID,
        account: accountId,
        relatedBill: _.eq(null), // 再次确认，安全第一
      })
      .update({ data: updateData })

    await transaction.commit()

    if (result.stats.updated > 0) {
      const updatedBills = await getBillsByIds({ query: { ids } }, models)
      return updatedBills
    }
    return []
  } catch (e) {
    await transaction.rollback()
    console.error('批量更新账单失败:', e)
    throw new Error(`批量更新账单失败: ${e.message}`)
  }
}

/**
 * 保存单条账单的核心逻辑（创建或更新）。
 * @param {object} billToSave - 要保存的账单对象
 * @param {string} accountId - 账户 ID
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 可选的数据库或事务实例
 * @returns {Promise<object>} - 保存后的账单对象
 */
async function _saveBill(billToSave, accountId, models, dbOrTransaction) {
  const { OPENID } = cloud.getWXContext()
  const originalBill = { ...billToSave }
  let savedBillId

  if (billToSave.category?.type === '10' && billToSave.amount < 0) {
    billToSave.amount = -billToSave.amount
  } else if (billToSave.category?.type === '20' && billToSave.amount > 0) {
    billToSave.amount = -billToSave.amount
  }

  const categoryId = billToSave.category?._id
  billToSave.category = categoryId

  if (Array.isArray(billToSave.tags)) {
    billToSave.tags = billToSave.tags.map((tag) => tag._id).filter(Boolean)
  }

  const dataToSave = { ...billToSave }
  if (dataToSave.originBill) {
    dataToSave.originBill = billToSave.originBill
  }

  if (billToSave._id) {
    const billId = billToSave._id
    delete dataToSave._id
    delete dataToSave.originBill

    const oldBillRes = await dbOrTransaction.collection('bill').doc(billId).get()
    if (!oldBillRes.data) throw new Error(`找不到 ID 为 ${billId} 的账单`)
    const oldBill = oldBillRes.data

    if (oldBill._openid && oldBill._openid !== OPENID) {
      throw new Error(`没有权限修改账单 ${billId}`)
    }

    const balanceIncrement = parseMoney(dataToSave.amount - oldBill.amount)

    // 计算旧账单对收入和支出的贡献（支出为正值）
    const oldIncome = oldBill.amount > 0 ? oldBill.amount : 0
    const oldExpense = oldBill.amount < 0 ? Math.abs(oldBill.amount) : 0

    // 计算新账单对收入和支出的贡献（支出为正值）
    const newIncome = dataToSave.amount > 0 ? dataToSave.amount : 0
    const newExpense = dataToSave.amount < 0 ? Math.abs(dataToSave.amount) : 0

    // 计算总收入和总支出的增量
    const incomeIncrement = parseMoney(newIncome - oldIncome)
    const expenseIncrement = parseMoney(newExpense - oldExpense)

    await _updateAccount(
      { query: { accountId }, body: { balanceIncrement, incomeIncrement, expenseIncrement } },
      models,
      dbOrTransaction,
    )
    await dbOrTransaction
      .collection('bill')
      .doc(billId)
      .update({ data: { ...dataToSave, updatedAt: Date.now(), updatedBy: OPENID } })
    savedBillId = billId
  } else {
    const balanceIncrement = dataToSave.amount
    const incomeIncrement = balanceIncrement > 0 ? balanceIncrement : 0
    const expenseIncrement = balanceIncrement < 0 ? Math.abs(balanceIncrement) : 0

    await _updateAccount(
      { query: { accountId }, body: { balanceIncrement, incomeIncrement, expenseIncrement } },
      models,
      dbOrTransaction,
    )
    const createResult = await dbOrTransaction.collection('bill').add({
      data: {
        ...dataToSave,
        account: accountId,
        _openid: OPENID,
        createdAt: Date.now(),
        createdBy: OPENID,
        updatedAt: Date.now(),
        updatedBy: OPENID,
      },
    })
    if (!createResult._id) throw new Error('创建新账单失败')
    savedBillId = createResult._id
  }

  if (categoryId) {
    await dbOrTransaction
      .collection('category')
      .doc(categoryId)
      .update({ data: { usedAt: Date.now() } })
  }

  // 保存成功后，从数据库重新获取完整的账单信息，以确保数据一致性
  const newBills = await _getBillsByIds({ query: { ids: [savedBillId] } }, models, dbOrTransaction)

  if (!newBills || newBills.length === 0) {
    throw new Error('保存账单后无法找到该账单')
  }

  return newBills[0]
}

/**
 * 保存转账账单（双向）
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 * @param {object} [transaction] - 可选的数据库事务实例
 */
async function _saveTransfer(event, models, dbOrTransaction) {
  const { bill } = event.body
  const { accountId: currentAccountId } = event.query || {}
  const { getAccount } = require('./account.js')
  const { OPENID } = cloud.getWXContext()

  const main = async (tx) => {
    // For imported bills, try to find the counterpart and re-link
    if (bill.originBill) {
      const counterpartRes = await tx
        .collection('bill')
        .where(_.or([{ relatedBill: bill.originBill }, { deletedRelatedBill: bill.originBill }]))
        .limit(1)
        .get()

      if (counterpartRes.data && counterpartRes.data.length > 0) {
        const counterpartBill = counterpartRes.data[0]
        const currentBill = await _saveBill(bill, currentAccountId, models, tx)
        // Re-establish the link
        await tx
          .collection('bill')
          .doc(currentBill._id)
          .update({ data: { relatedBill: counterpartBill._id } })
        // Also update the counterpart's relatedBill to point to the new bill's ID
        const counterpartUpdateData = {
          relatedBill: currentBill._id,
        }
        // If the link was re-established via deletedRelatedBill, remove that field
        if (counterpartBill.deletedRelatedBill === bill.originBill) {
          counterpartUpdateData.deletedRelatedBill = _.remove()
        }
        await tx.collection('bill').doc(counterpartBill._id).update({ data: counterpartUpdateData })
        return { ...currentBill, relatedBill: counterpartBill._id }
      }
    }

    // 当更新一个已存在的转账账单时（有 _id 和 relatedBill），
    // 我们只需要更新当前账单和其关联账单的信息，而不是创建新的转账对。
    if (bill._id && bill.relatedBill) {
      // 这是一个更新操作，但不需要创建新的转账对，仅更新双方信息
      // 注意：这里的 _saveBill 内部会处理余额的更新
      const savedBill = await _saveBill(bill, currentAccountId, models, tx)

      // 使用 getBillsByIds 获取完整的关联账单信息
      const relatedBills = await _getBillsByIds({ query: { ids: [bill.relatedBill] } }, models, tx)

      if (!relatedBills || relatedBills.length === 0) {
        // 如果关联账单找不到，可能已被删除，这里只更新当前账单
        return savedBill
      }
      const relatedBillData = relatedBills[0]

      // 构建要更新的关联账单信息
      const relatedBillUpdate = {
        amount: -savedBill.amount, // 金额相反
        datetime: savedBill.datetime, // 日期同步
        tags: (savedBill.tags || []).map((tag) => tag._id), // 同步标签，确保只存入 ID
        category: relatedBillData.category,
        updatedAt: Date.now(),
        updatedBy: OPENID,
      }

      // 使用 _saveBill 复用逻辑，更新关联账单并自动处理其账户余额
      await _saveBill(
        {
          _id: bill.relatedBill,
          ...relatedBillUpdate,
        },
        relatedBillData.account,
        models,
        tx,
      )

      return savedBill
    }

    const { category, amount, datetime, note } = bill
    const targetAccountInfo = category?.account
    if (!targetAccountInfo || !targetAccountInfo._id) {
      console.warn('转账目标账户信息不完整,保存为断联转账')
      // 如果目标账户ID为空，只保存当前账户的转账记录, relatedBill也要删除
      delete bill.relatedBill
      const billOut = {
        ...bill,
        amount: -Math.abs(parseMoney(amount)),
        category: category,
        account: currentAccountId,
        note: note || `转账目标账户信息不完整`,
      }
      const savedBillOut = await _saveBill(billOut, currentAccountId, models, tx)
      return { ...savedBillOut, relatedBill: null }
    }
    const targetAccountId = targetAccountInfo._id
    if (targetAccountId === currentAccountId) {
      throw new Error('转账失败：转出账户和转入账户不能相同')
    }

    const isTransferOut = category.name === '转账'

    const sourceAccountId = isTransferOut ? currentAccountId : targetAccountId
    const destinationAccountId = isTransferOut ? targetAccountId : currentAccountId

    const [sourceAccount, destinationAccount, transferOutCategoryRes, transferInCategoryRes] =
      await Promise.all([
        getAccount({ query: { accountId: sourceAccountId } }, models, tx),
        getAccount({ query: { accountId: destinationAccountId } }, models, tx),
        db
          .collection('category')
          .where({ name: '转账', _openid: _.exists(false) })
          .get(),
        db
          .collection('category')
          .where({ name: '收转账', _openid: _.exists(false) })
          .get(),
      ])

    if (!sourceAccount) throw new Error('转账失败：找不到源账户')
    if (!destinationAccount) throw new Error('转账失败：找不到目标账户')

    const transferAmount = Math.abs(parseMoney(amount))
    if (sourceAccount.balance < transferAmount) {
      throw new BizError('账户余额不足，无法转账')
    }

    if (!transferOutCategoryRes.data || transferOutCategoryRes.data.length === 0)
      throw new Error('转账失败：找不到内置分类“转账”')
    if (!transferInCategoryRes.data || transferInCategoryRes.data.length === 0)
      throw new Error('转账失败：找不到内置分类“收转账”')

    const transferOutCat = transferOutCategoryRes.data[0]
    const transferInCat = transferInCategoryRes.data[0]

    const noteForBillOut = isTransferOut
      ? note || `向 ${destinationAccount.title} 转账`
      : `向 ${destinationAccount.title} 转账`
    const noteForBillIn = isTransferOut
      ? `从 ${sourceAccount.title} 转入`
      : note || `从 ${sourceAccount.title} 转入`

    const billOut = {
      ...bill,
      amount: -transferAmount,
      category: transferOutCat,
      account: sourceAccountId,
      note: noteForBillOut,
    }

    const billIn = {
      ...bill,
      _id: undefined,
      amount: transferAmount,
      category: transferInCat,
      account: destinationAccountId,
      note: noteForBillIn,
      tags: [],
    }

    const savedBillOut = await _saveBill(billOut, sourceAccountId, models, tx)
    const savedBillIn = await _saveBill(billIn, destinationAccountId, models, tx)

    await tx
      .collection('bill')
      .doc(savedBillOut._id)
      .update({ data: { relatedBill: savedBillIn._id } })
    await tx
      .collection('bill')
      .doc(savedBillIn._id)
      .update({ data: { relatedBill: savedBillOut._id } })

    const primaryBill = isTransferOut ? savedBillOut : savedBillIn
    const secondaryBill = isTransferOut ? savedBillIn : savedBillOut

    return { ...primaryBill, relatedBill: secondaryBill._id }
  }

  if (dbOrTransaction) {
    return main(dbOrTransaction)
  } else {
    const tx = await db.startTransaction()
    try {
      const result = await main(tx)
      await tx.commit()
      return result
    } catch (e) {
      await tx.rollback()
      if (e.isBiz) {
        throw e
      }
      throw new Error(`转账失败: ${e.message}`)
    }
  }
}

/**
 * 核心批量保存账单逻辑（内部函数）。
 * @param {Array<object>} bills - 准备存入数据库的账单对象数组
 * @param {string} accountId - 账户 ID
 * @param {object} models - 数据模型实例
 * @param {object} dbOrTransaction - 数据库事务实例
 * @returns {Array<object>} - 保存后的账单对象数组
 */
async function _saveBills(bills, accountId, models, dbOrTransaction) {
  if (!Array.isArray(bills) || bills.length === 0) {
    throw new Error('请求中缺少 bills 数组')
  }

  const savedBills = []

  for (const bill of bills) {
    if (!bill.category) {
      throw new Error('批量保存的账单中存在缺少 category 的项')
    }
    const isTransfer = bill.category.name === '转账' || bill.category.name === '收转账'
    let savedBill
    if (isTransfer) {
      const transferEvent = { body: { bill }, query: { accountId } }
      savedBill = await _saveTransfer(transferEvent, models, dbOrTransaction)
    } else {
      savedBill = await _saveBill(bill, accountId, models, dbOrTransaction)
    }
    savedBills.push(savedBill)
  }
  return savedBills
}

/**
 * 删除账单的核心逻辑。
 * 会自动处理关联的转账账单，并更新相关账户的余额。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 可选的数据库或事务实例
 * @returns {Promise<{deleted: number}>} - 包含删除数量的对象
 */
async function _deleteBills(event, models, dbOrTransaction) {
  const { ids, accountId } = event.query
  const { isDeactivating } = event
  const { OPENID } = cloud.getWXContext()

  const initialBillsRes = await dbOrTransaction
    .collection('bill')
    .where({
      _id: _.in(ids),
      account: _.eq(accountId),
      _openid: _.eq(OPENID),
    })
    .get()
  const initialBills = initialBillsRes.data || []

  const relatedBillIds = initialBills.map((b) => b.relatedBill).filter(Boolean)

  const finalBillIds = Array.from(new Set([...ids, ...relatedBillIds]))

  if (finalBillIds.length === 0) {
    return { deleted: 0 }
  }

  const billsRes = await dbOrTransaction
    .collection('bill')
    .where({
      _id: _.in(finalBillIds),
      _openid: _.eq(OPENID),
    })
    .get()
  const finalBillsToDelete = billsRes.data

  const accountChanges = finalBillsToDelete.reduce((acc, bill) => {
    const { account, amount } = bill
    if (!acc[account]) {
      acc[account] = { balanceIncrement: 0, incomeIncrement: 0, expenseIncrement: 0 }
    }
    acc[account].balanceIncrement -= amount
    if (amount > 0) {
      acc[account].incomeIncrement -= amount
    } else {
      acc[account].expenseIncrement -= amount
    }
    return acc
  }, {})

  for (const id of Object.keys(accountChanges)) {
    const changes = accountChanges[id]
    if (isDeactivating && id === accountId) {
      continue
    }
    await _updateAccount(
      {
        query: { accountId: id },
        body: {
          balanceIncrement: parseMoney(changes.balanceIncrement),
          incomeIncrement: parseMoney(changes.incomeIncrement),
          expenseIncrement: parseMoney(changes.expenseIncrement),
        },
      },
      models,
      dbOrTransaction,
    )
  }

  const deleteResult = await dbOrTransaction
    .collection('bill')
    .where({
      _id: _.in(finalBillIds),
      _openid: _.eq(OPENID),
    })
    .remove()

  return { deleted: deleteResult.stats.removed }
}

/**
 * 按指定维度对账单进行分组聚合。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<object>} - 分组聚合后的结果
 */
async function groupBills(event, models) {
  const {
    by: dimension,
    accountIds,
    exclude = true,
    transfer = true,
    balance = true,
  } = event.query || {}
  const where = await buildBillQuery(event, models)

  // 仅在 groupBills 中处理 accountIds
  if (accountIds && accountIds.length > 0) {
    // 移除 buildBillQuery 可能已添加的 accountId 条件
    const andClauses = where.$and.filter((cond) => !cond.account)
    andClauses.push({ account: { $in: accountIds } })
    where.$and = andClauses
  }
  const $ = _.aggregate

  if (where.noMatch) {
    return { data: [] }
  }

  const aggregate = db.collection('bill').aggregate()

  // 1. 匹配主查询条件
  aggregate.match(where)

  // 2. 附加过滤条件
  if (exclude === false) {
    const { data: excludedTags } = await db
      .collection('tag')
      .where({ name: '非日常' })
      .field({ _id: true })
      .get()
    const excludedTagIds = excludedTags.map((t) => t._id)
    if (excludedTagIds.length > 0) {
      aggregate.match({ tags: _.nin(excludedTagIds) })
    }
  }

  if (transfer === false) {
    const { data: transferCategories } = await db
      .collection('category')
      .where({
        name: _.in(['转账', '收转账']),
        _openid: _.exists(false),
      })
      .field({ _id: true })
      .get()
    if (transferCategories.length > 0) {
      const transferCategoryIds = transferCategories.map((c) => c._id)
      aggregate.match({ category: _.nin(transferCategoryIds) })
    }
  }

  // 新增：如果 balance 为 false，则排除“余额”相关的分类
  if (balance === false) {
    const { data: balanceCategories } = await db
      .collection('category')
      .where({
        name: _.in(['余额']),
      })
      .field({ _id: true })
      .get()
    if (balanceCategories.length > 0) {
      const balanceCategoryIds = balanceCategories.map((c) => c._id)
      aggregate.match({ category: _.nin(balanceCategoryIds) })
    }
  }

  let groupId
  switch (dimension) {
    case 'category':
      groupId = '$category'
      break
    case 'month':
      groupId = $.dateToString({
        format: '%Y-%m',
        // 将时间戳(long)转换为Date对象
        date: $.add([new Date(0), '$datetime']),
        timezone: 'Asia/Shanghai', // 指定中国时区
      })
      break
    default:
      throw new Error(`不支持的分组维度: ${dimension}`)
  }

  // 分组阶段
  aggregate.group({
    _id: groupId,
    totalAmount: $.sum('$amount'),
    count: $.sum(1),
  })

  // 排序阶段
  if (dimension === 'month') {
    aggregate.sort({
      _id: 1, // 按月份正序
    })
  } else if (dimension === 'category') {
    aggregate.sort({
      totalAmount: -1, // 按总金额倒序
    })
  }

  const result = await aggregate.end()

  let populatedResult = result.list

  if (dimension === 'category') {
    const categoryIds = result.list.map((item) => item._id).filter(Boolean)
    const categories = await getCategoriesByIds({ query: { ids: categoryIds } }, models)
    const categoryMap = categories.reduce((map, cat) => {
      map[cat._id] = cat
      return map
    }, {})
    populatedResult = result.list.map((item) => ({
      ...item,
      groupInfo: categoryMap[item._id] || null,
    }))
  }

  return { data: populatedResult }
}

module.exports = {
  _saveBill,
  saveBill,
  _saveBills,
  saveBills,
  getBillsSummary,
  getBills,
  getAllBills,
  _getBillsByIds,
  getBillsByIds,
  deleteBill,
  _deleteBills,
  deleteBills,
  resetBills,
  _saveTransfer,
  saveTransfer,
  updateBills,
  groupBills,
}
