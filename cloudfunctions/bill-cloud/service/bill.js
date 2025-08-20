const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')
const { getCategoryIds, getCategoriesByIds } = require('./category.js')
const { getTagsByIds } = require('./tag.js')
const {
  updateAccount,
  parseMoney,
  populateTagsForBills,
  populateCategoriesForBills,
  saveBill: _saveBill,
  deleteBills: _deleteBills,
} = require('./helper.js')

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

  // 前端传入的仍然是完整的 category 对象
  if (!bill || !bill.category) {
    throw new Error('请求中缺少 bill 或 category 对象')
  }

  // 业务逻辑判断依然使用传入的 category 对象
  const isTransfer = bill.category.name === '转账' || bill.category.name === '收转账'
  const { saveTransfer: _saveTransfer } = require('./helper.js')

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

  const { saveTransfer: _saveTransfer } = require('./helper.js')
  const transaction = await db.startTransaction()

  try {
    const savedBills = []
    for (const bill of bills) {
      // 假设前端传入的 bill 中包含完整的 category 对象
      if (!bill.category) {
        throw new Error('批量保存的账单中存在缺少 category 的项')
      }
      const isTransfer = bill.category.name === '转账' || bill.category.name === '收转账'
      let savedBill
      if (isTransfer) {
        const transferEvent = { body: { bill }, query: { accountId } }
        savedBill = await _saveTransfer(transferEvent, models, transaction)
      } else {
        savedBill = await _saveBill(bill, accountId, models, transaction)
      }
      savedBills.push(savedBill)
    }

    await transaction.commit()
    return savedBills
  } catch (e) {
    await transaction.rollback()
    throw e
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
      category: true, // 字段名是 category，其值为 ID
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

  const billsWithCategory = await populateCategoriesForBills(bills, models)
  return populateTagsForBills(billsWithCategory, models)
}

/**
 * 根据月份获取账单总计
 * @param {object} event - 云函数的原始 event 对象
 */
async function getBillsSummary(event, models) {
  const { startTime, endTime, type, accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  const whereClause = {
    $and: [{ _openid: { $eq: OPENID } }, { account: { $eq: accountId } }],
  }

  if (startTime && endTime) {
    whereClause.$and.push({ datetime: { $gte: startTime } }, { datetime: { $lte: endTime } })
  }

  if (type) {
    const categoryIds = await getCategoryIds({ query: { type } }, models)

    if (categoryIds.length > 0) {
      whereClause.$and.push({ category: { $in: categoryIds } }) // 字段名是 category，查询的是 ID
    } else {
      return { totalIncome: 0, totalExpense: 0 }
    }
  }

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
    return res.data.records[0].datetime
  }
  return null
}

/**
 * 获取账单列表
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getBills(event, models) {
  const { startTime, endTime, type, startDate: startDateTs, accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  const where = {
    $and: [{ _openid: { $eq: OPENID } }, { account: { $eq: accountId } }],
  }

  if (startTime && endTime) {
    where.$and.push({ datetime: { $gte: startTime } }, { datetime: { $lte: endTime } })
  }
  if (type) {
    const categoryIds = await getCategoryIds({ query: { type } }, models)
    if (categoryIds.length > 0) {
      where.$and.push({ category: { $in: categoryIds } }) // 字段名是 category，查询的是 ID
    } else {
      return { data: [], nextStartDate: null }
    }
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

    const {
      data: { records: periodBills },
    } = await models.bill.list({
      select: {
        _id: true,
        amount: true,
        datetime: true,
        note: true,
        category: true, // 字段名是 category, 其值为 ID
        tags: true,
        createdAt: true,
      },
      filter: { where: periodWhereClause },
      orderBy: [{ datetime: 'desc' }],
      pageSize: 1000,
    })

    if (periodBills && periodBills.length > 0) {
      accumulatedBills = accumulatedBills.concat(periodBills)
    }

    if (hasReachedEnd) {
      break
    }

    currentDateTs = dayjs(currentDateTs).subtract(FETCH_WINDOW_DAYS, 'day').valueOf()
    loopCount++
  }

  const billsWithCategory = await populateCategoriesForBills(accumulatedBills, models)
  const populatedBills = await populateTagsForBills(billsWithCategory, models)

  return {
    data: populatedBills,
    nextStartDate: hasReachedEnd ? null : currentDateTs,
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
      where.$and.push({ category: { $in: categoryIds } }) // 字段名是 category, 查询的是 ID
    } else {
      return []
    }
  }

  if (createdAt) {
    const startDate = dayjs(createdAt).startOf('day').valueOf()
    const endDate = dayjs(createdAt).endOf('day').valueOf()

    where.$and.push({ createdAt: { $gte: startDate } }, { createdAt: { $lte: endDate } })
  }

  const {
    data: { records },
  } = await models.bill.list({
    select: {
      _id: true,
      amount: true,
      datetime: true,
      note: true,
      category: true, // 字段名是 category, 其值为 ID
      tags: true,
      createdAt: true,
    },
    filter: { where },
    orderBy: [{ datetime: 'desc' }],
    pageSize: 1000,
  })

  const billsWithCategory = await populateCategoriesForBills(records, models)
  return populateTagsForBills(billsWithCategory, models)
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
    await updateAccount(
      {
        query: { accountId },
        body: {
          balanceIncrement: parseMoney(-amountToDelete),
          incomeIncrement: parseMoney(amountToDelete > 0 ? -amountToDelete : 0),
          expenseIncrement: parseMoney(amountToDelete < 0 ? -amountToDelete : 0),
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

        await updateAccount(
          {
            query: { accountId: relatedAccountId },
            body: {
              balanceIncrement: parseMoney(-relatedAmount),
              incomeIncrement: parseMoney(relatedAmount > 0 ? -relatedAmount : 0),
              expenseIncrement: parseMoney(relatedAmount < 0 ? -relatedAmount : 0),
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

  const { saveTransfer: _saveTransfer } = require('./helper.js')
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

module.exports = {
  saveBill,
  saveBills,
  getBillsSummary,
  getBills,
  getAllBills,
  getBillsByIds,
  deleteBill,
  deleteBills,
  resetBills,
  saveTransfer,
}
