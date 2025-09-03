const cloud = require('wx-server-sdk')
const { getTagsByIds } = require('./tag.js')

const db = cloud.database()
const _ = db.command

/**
 * 自定义业务逻辑错误类。
 * 用于在事务中区分业务错误和系统错误，以便正确处理回滚。
 */
class BizError extends Error {
  constructor(message) {
    super(message)
    this.isBiz = true
  }
}

/**
 * 将任意值解析为标准的货币格式（保留两位小数的数字）。
 * @param {*} amount - 需要解析的金额
 * @returns {number} - 格式化后的金额
 */
function parseMoney(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) {
    return 0
  }
  return Number(num.toFixed(2))
}

/**
 * 尝试将字符串解析为 JSON 对象。
 * 如果解析失败，则返回原始字符串。
 * @param {string} str - 需要解析的字符串
 * @returns {object|string} - 解析后的对象或原始字符串
 */
function tryParseJSON(str) {
  if (typeof str !== 'string') {
    return str
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    return str
  }
}

/**
 * 尝试将 JavaScript 值转换为 JSON 字符串。
 * @param {*} value - 需要转换的值
 * @returns {string} - JSON 字符串或原始值的字符串表示
 */
function tryStringifyJSON(value) {
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch (e) {
      return String(value)
    }
  }
  return value
}

/**
 * 为账单列表填充完整的标签对象。
 * @param {Array<object>} bills - 账单列表，其中 tags 字段为 ID 数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<Array<object>>} - 填充了完整标签对象的账单列表
 */
async function populateTagsForBills(bills, models) {
  if (bills.length > 0) {
    const allTagIds = [...new Set(bills.flatMap((bill) => bill.tags || []).filter(Boolean))]

    if (allTagIds.length > 0) {
      const tags = await getTagsByIds({ query: { ids: allTagIds } }, models)
      const tagsMap = new Map(tags.map((tag) => [tag._id, tag]))

      bills.forEach((bill) => {
        if (Array.isArray(bill.tags)) {
          bill.tags = bill.tags.map((tagId) => tagsMap.get(tagId)).filter(Boolean)
        }
      })
    }
  }
  return bills
}

/**
 * 为账单列表填充完整的分类对象。
 * @param {Array<object>} bills - 账单列表，其中 category 字段为 ID
 * @param {object} models - 数据模型实例
 * @returns {Promise<Array<object>>} - 填充了完整分类对象的账单列表
 */
async function populateCategoriesForBills(bills, models) {
  if (!bills || bills.length === 0) {
    return []
  }

  const categoryIds = [...new Set(bills.map((b) => b.category).filter(Boolean))]

  if (categoryIds.length === 0) {
    return bills
  }

  const { getCategoriesByIds } = require('./category.js')
  const categories = await getCategoriesByIds({ query: { ids: categoryIds } }, models)

  const categoryMap = new Map(categories.map((c) => [c._id, c]))

  return bills.map((bill) => {
    return {
      ...bill,
      category: categoryMap.get(bill.category) || null,
    }
  })
}

/**
 * 停用（删除）账本的核心逻辑。
 * 会删除账本下的所有账单，并处理关联的转账记录。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} dbOrTransaction - 数据库事务实例
 * @returns {Promise<object>} - 操作结果
 */
async function deactivateAccount(event, models, dbOrTransaction) {
  const { accountId } = event.query
  const { OPENID } = cloud.getWXContext()

  // 1. 验证用户对目标账本的所有权
  const accountRes = await dbOrTransaction.collection('account').doc(accountId).get()
  if (!accountRes.data || accountRes.data._openid !== OPENID) {
    throw new BizError(`找不到 ID 为 ${accountId} 的账本，或没有权限删除。`)
  }

  // 2. 找到账本内的所有账单ID
  const billsInAccountRes = await dbOrTransaction
    .collection('bill')
    .where({
      account: _.eq(accountId),
      _openid: _.eq(OPENID),
    })
    .get()
  const billIdsInAccount = (billsInAccountRes.data || []).map((b) => b._id)

  // 3. 查找并处理与其他账本关联的转账账单
  // 如果A账本的账单被B账本的转账账单关联，删除A账本时，需要处理B账本的关联记录
  const relatedBillsRes = await dbOrTransaction
    .collection('bill')
    .where({
      relatedBill: _.in(billIdsInAccount),
      _openid: _.eq(OPENID),
    })
    .get()
  const relatedBills = relatedBillsRes.data || []

  // 解除关联关系，防止留下悬空引用
  if (relatedBills.length > 0) {
    const batchSize = 3 // 分批处理，避免单次操作数据量过大
    for (let i = 0; i < relatedBills.length; i += batchSize) {
      const batch = relatedBills.slice(i, i + batchSize)
      const updatePromises = batch.map((bill) => {
        return dbOrTransaction
          .collection('bill')
          .doc(bill._id)
          .update({
            data: {
              // 将被删除的关联ID存起来，以备追溯
              deletedRelatedBill: bill.relatedBill,
              // 原子操作：移除字段
              relatedBill: _.remove(),
            },
          })
      })
      await Promise.all(updatePromises)
    }
  }

  // 4. 删除账本内的所有账单
  let deletedCount = 0
  if (billIdsInAccount.length > 0) {
    const deleteResult = await dbOrTransaction
      .collection('bill')
      .where({
        _id: _.in(billIdsInAccount),
      })
      .remove()
    deletedCount = deleteResult.stats.removed
  }

  // 5. 删除账本本身
  await dbOrTransaction.collection('account').doc(accountId).remove()

  // 6. 返回操作结果
  return {
    success: true,
    message: '账本及其所有账单已删除，关联转账记录已处理',
    deletedBills: deletedCount,
  }
}

/**
 * 根据名称和类型批量获取分类。
 * 如果分类不存在，则会自动为当前用户创建。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 可选的数据库或事务实例
 * @returns {Promise<Array<object>>} - 分类对象列表
 */
async function getCategoryByNames(event, models, dbOrTransaction) {
  const { categories: categoriesInfo } = event.query || {}
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!categoriesInfo || categoriesInfo.length === 0) {
    return []
  }

  const finalCategories = []
  const categoryMap = new Map()

  const orConditions = categoriesInfo.map((info) => ({ name: info.name, type: info.type }))
  const { data: privateCategories } = await dbInstance
    .collection('category')
    .where({
      _openid: OPENID,
      $or: orConditions,
    })
    .get()

  for (const cat of privateCategories) {
    const key = `${cat.name}-${cat.type}`
    if (!categoryMap.has(key)) {
      finalCategories.push(cat)
      categoryMap.set(key, cat)
    }
  }

  const remainingInfos = categoriesInfo.filter(
    (info) => !categoryMap.has(`${info.name}-${info.type}`),
  )
  if (remainingInfos.length > 0) {
    const publicOrConditions = remainingInfos.map((info) => ({ name: info.name, type: info.type }))
    const { data: publicCategories } = await dbInstance
      .collection('category')
      .where({
        _openid: _.exists(false),
        $or: publicOrConditions,
      })
      .get()

    for (const cat of publicCategories) {
      const key = `${cat.name}-${cat.type}`
      if (!categoryMap.has(key)) {
        finalCategories.push(cat)
        categoryMap.set(key, cat)
      }
    }
  }

  const categoriesToCreate = categoriesInfo.filter(
    (info) => !categoryMap.has(`${info.name}-${info.type}`),
  )
  if (categoriesToCreate.length > 0) {
    const newCategoriesData = categoriesToCreate.map((info) => ({
      name: info.name,
      type: info.type,
      _openid: OPENID,
      createdAt: Date.now(),
      usedAt: Date.now(),
    }))

    const createResult = await dbInstance.collection('category').add({
      data: newCategoriesData,
    })

    const { data: newCreatedCategories } = await dbInstance
      .collection('category')
      .where({
        _id: _.in(createResult._ids),
      })
      .get()

    finalCategories.push(...newCreatedCategories)
  }

  return finalCategories
}

/**
 * 根据名称批量获取标签。
 * 如果标签不存在，则会自动为当前用户创建。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 可选的数据库或事务实例
 * @returns {Promise<Array<object>>} - 标签对象列表
 */
async function getTagsByNames(event, models, dbOrTransaction) {
  const { names } = event.query || {}
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!names || names.length === 0) {
    return []
  }

  const finalTags = []
  const tagMap = new Map()

  // 1. 查找私有标签
  const { data: privateTags } = await dbInstance
    .collection('tag')
    .where({
      _openid: OPENID,
      name: _.in(names),
    })
    .get()

  for (const tag of privateTags) {
    if (!tagMap.has(tag.name)) {
      finalTags.push(tag)
      tagMap.set(tag.name, tag)
    }
  }

  // 2. 查找公共标签
  const remainingNames = names.filter((name) => !tagMap.has(name))
  if (remainingNames.length > 0) {
    const { data: publicTags } = await dbInstance
      .collection('tag')
      .where({
        _openid: _.exists(false),
        name: _.in(remainingNames),
      })
      .get()

    for (const tag of publicTags) {
      if (!tagMap.has(tag.name)) {
        finalTags.push(tag)
        tagMap.set(tag.name, tag)
      }
    }
  }

  // 3. 创建新的私有标签
  const tagsToCreate = names.filter((name) => !tagMap.has(name))
  if (tagsToCreate.length > 0) {
    const newTagsData = tagsToCreate.map((name) => ({
      name,
      _openid: OPENID,
      createdAt: Date.now(),
    }))

    const createResult = await dbInstance.collection('tag').add({
      data: newTagsData,
    })

    const { data: newCreatedTags } = await dbInstance
      .collection('tag')
      .where({
        _id: _.in(createResult._ids),
      })
      .get()

    finalTags.push(...newCreatedTags)
  }

  return finalTags
}

module.exports = {
  parseMoney,
  populateTagsForBills,
  populateCategoriesForBills,
  deactivateAccount,
  getCategoryByNames,
  getTagsByNames,
  tryParseJSON,
  tryStringifyJSON,
  BizError,
}
