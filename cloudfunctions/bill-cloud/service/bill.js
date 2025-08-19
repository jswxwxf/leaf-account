const cloud = require('wx-server-sdk')
const dayjs = require('dayjs')
const { getCategoryIds } = require('./category.js')
const { getTagsByIds } = require('./tag.js')
const {
  updateAccount,
  parseMoney,
  populateTagsForBills,
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
  const isTransfer = bill.category.name === '转账' || bill.category.name === '收转账'
  const { saveTransfer: _saveTransfer } = require('./common.js')

  // 对于普通账单和转账，都开启独立事务
  const transaction = await db.startTransaction()
  try {
    let savedBill
    if (isTransfer) {
      savedBill = await _saveTransfer(event, models, transaction)
    } else {
      savedBill = await _saveBill(bill, accountId, models, transaction)
    }
    await transaction.commit()
    return savedBill
  } catch (e) {
    await transaction.rollback()
    // 抛出原始错误，保留 BizError 等特殊错误类型
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

  const { saveTransfer: _saveTransfer } = require('./common.js')
  const transaction = await db.startTransaction()

  try {
    const savedBills = []
    for (const bill of bills) {
      const isTransfer = bill.category.name === '转账' || bill.category.name === '收转账'
      let savedBill
      if (isTransfer) {
        // 对于转账，需要构建符合 saveTransfer 期望的 event 结构
        const transferEvent = { body: { bill }, query: { accountId } }
        savedBill = await _saveTransfer(transferEvent, models, transaction)
      } else {
        // 对于普通账单，直接调用内部保存函数
        savedBill = await _saveBill(bill, accountId, models, transaction)
      }
      savedBills.push(savedBill)
    }

    await transaction.commit()
    return savedBills
  } catch (e) {
    await transaction.rollback()
    // 抛出原始错误，以便上层能捕获到 BizError 等
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
  const { startTime, endTime, type, accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  // 权限：只能获取自己的或公共的
  const whereClause = {
    $and: [{ _openid: { $eq: OPENID } }, { account: { $eq: accountId } }],
  }

  if (startTime && endTime) {
    whereClause.$and.push({ datetime: { $gte: startTime } }, { datetime: { $lte: endTime } })
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

  // 1. 构建基础查询条件，确保用户只能访问自己的账本
  const where = {
    $and: [{ _openid: { $eq: OPENID } }, { account: { $eq: accountId } }],
  }

  // 2. 应用时间范围和类型筛选
  if (startTime && endTime) {
    where.$and.push({ datetime: { $gte: startTime } }, { datetime: { $lte: endTime } })
  }
  if (type) {
    const categoryIds = await getCategoryIds({ query: { type } }, models)
    if (categoryIds.length > 0) {
      where.$and.push({ category: { $in: categoryIds } })
    } else {
      // 如果没有找到匹配的分类，直接返回空，避免无效查询
      return { data: [], nextStartDate: null }
    }
  }

  // 3. 获取符合筛选条件的账单中最早的日期，用于后续判断分页是否已到达末尾
  const minDateTs = await getMinDate(models, where)
  if (!minDateTs) {
    // 如果没有任何账单，直接返回空
    return { data: [], nextStartDate: null }
  }

  // 4. 确定本次分页加载的起始时间戳
  let currentDateTs
  if (startTime && endTime) {
    // 如果是按月查询，则从指定的 startDate (翻页时) 或月份的最后一天 (首次加载) 开始
    currentDateTs = startDateTs || endTime
  } else {
    // 如果是查询所有账单，则从指定的 startDate (翻页时) 或当前时间 (首次加载) 开始
    currentDateTs = startDateTs || Date.now()
  }

  // 5. 循环获取数据，直到满足最小记录数或已加载完所有数据
  const MIN_RECORDS = 20 // 每次加载至少要获取的记录数
  const FETCH_WINDOW_DAYS = 7 // 每次向前追溯查询的时间窗口天数
  const MAX_LOOP = 30 // 设置合理的循环上限，防止意外的无限循环
  let accumulatedBills = []
  let loopCount = 0
  let hasReachedEnd = false

  while (accumulatedBills.length < MIN_RECORDS && loopCount < MAX_LOOP) {
    // 确定当前查询周期的时间范围
    const periodEndDate = dayjs(currentDateTs).endOf('day')

    // 优化：如果周期的结束时间已经早于所有记录的最早时间，说明已经到底，无需继续查询
    if (periodEndDate.valueOf() < minDateTs) {
      hasReachedEnd = true
      break
    }

    const periodStartDate = dayjs(currentDateTs).subtract(FETCH_WINDOW_DAYS - 1, 'day').startOf('day')

    // 如果计算出的周期开始时间早于最早记录时间，则将其调整为最早记录时间，并标记为最后一次循环
    let finalPeriodStartTs = periodStartDate.valueOf()
    if (finalPeriodStartTs < minDateTs) {
      finalPeriodStartTs = dayjs(minDateTs).startOf('day').valueOf()
      hasReachedEnd = true
    }

    // 组合最终的查询条件并从数据库获取数据
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
        category: { _id: true, name: true, type: true },
        tags: true,
        createdAt: true,
      },
      filter: { where: periodWhereClause },
      orderBy: [{ datetime: 'desc' }],
      pageSize: 1000, // 在一个窗口期内，假设记录数不会超过1000
    })

    if (periodBills && periodBills.length > 0) {
      accumulatedBills = accumulatedBills.concat(periodBills)
    }

    // 如果已标记为最后一次循环，则退出
    if (hasReachedEnd) {
      break
    }

    // 准备下一次迭代的开始时间戳
    currentDateTs = dayjs(currentDateTs).subtract(FETCH_WINDOW_DAYS, 'day').valueOf()
    loopCount++
  }

  // 6. 为获取到的账单填充完整的标签信息，并返回给客户端
  const populatedBills = await populateTagsForBills(accumulatedBills, models)
  return {
    data: populatedBills,
    // 如果已到达末尾，nextStartDate 为 null，否则返回下一次开始查询的时间戳
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
      where.$and.push({ category: { $in: categoryIds } })
    } else {
      return [] // 如果没有找到该类型的分类，直接返回空数组
    }
  }

  // 根据 createdDate 计算时间范围
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
  const { accountId } = event.query || {} // 这是主账单的账户ID
  const { OPENID } = cloud.getWXContext()

  if (!id) {
    throw new Error('请求中缺少 id 参数')
  }

  const transaction = await db.startTransaction()
  try {
    // 1. 获取要删除的账单信息
    const billRes = await transaction.collection('bill').doc(id).get()
    if (!billRes.data) {
      await transaction.commit()
      return true // 账单不存在，可能已被删除
    }
    const billToDelete = billRes.data

    // 2. 权限校验
    if (billToDelete._openid && billToDelete._openid !== OPENID) {
      await transaction.commit()
      return false // 无权限
    }

    // 3. 删除主账单及其影响
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

    // 4. 如果是转账，则联动删除关联账单
    if (billToDelete.relatedBill) {
      const relatedBillRes = await transaction.collection('bill').doc(billToDelete.relatedBill).get()
      if (relatedBillRes.data) {
        const relatedBill = relatedBillRes.data
        const relatedAmount = relatedBill.amount
        const relatedAccountId = relatedBill.account

        // 权限校验：确保关联账单也属于该用户
        if (relatedBill._openid && relatedBill._openid !== OPENID) {
          throw new Error('没有权限删除关联账单')
        }

        // 反向更新关联账户
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
        // 删除关联账单
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

  const transferOutCategory = categories.records.find(c => c.name === '转账')
  const transferInCategory = categories.records.find(c => c.name === '收转账')

  if (!transferOutCategory || !transferInCategory) {
    throw new Error('找不到内置的转账分类')
  }

  const category = type === 20 ? transferOutCategory : transferInCategory
  // 在 category 对象中嵌入目标账户信息，以匹配 common.js 中 saveTransfer 的期望结构
  category.account = targetAccount

  const bill = {
    category,
    amount,
    datetime: Date.now(),
    note: '',
  }

  // 构建一个新的 event 对象，其结构与 common.js 中的 saveTransfer 函数期望的完全一致
  const eventForCommon = {
    ...event,
    body: { bill },
    query: { accountId }, // 明确传递源账户ID
  }

  const { saveTransfer: _saveTransfer } = require('./common.js')
  return _saveTransfer(eventForCommon, models)
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
  saveTransfer,
}
