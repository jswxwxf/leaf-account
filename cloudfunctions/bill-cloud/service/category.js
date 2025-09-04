const cloud = require('wx-server-sdk')
const db = cloud.database()
const _ = db.command
const { BizError } = require('./helper.js')
const { isEmpty } = require('lodash')
const { pinyin } = require('pinyin-pro')

/**
 * 获取所有分类
 * @param {object} models - 数据模型实例
 */
async function getCategories(event, models) {
  const { type } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  const whereClauses = [
    {
      $or: [{ _openid: { $eq: OPENID } }, { _openid: { $empty: true } }],
    },
  ]

  if (type) {
    whereClauses.push({ type: { $eq: type } })
  }

  const finalWhere = whereClauses.length > 1 ? { $and: whereClauses } : whereClauses[0]

  const { data } = await models.category.list({
    filter: { where: finalWhere },
    orderBy: [{ type: 'desc' }, { name: 'desc' }],
    pageSize: 1000,
  })

  const recordsWithFlag = data.records.map((record) => ({
    ...record,
    isBuiltIn: !record._openid,
  }))

  return recordsWithFlag
}

/**
 * 添加一个新分类
 * @param {object} category - 要添加的分类对象
 * @param {object} models - 数据模型实例
 */
async function addCategory(event, models) {
  const { category } = event.body
  const { OPENID } = cloud.getWXContext()

  const categoryName = category?.name?.trim()
  if (!category || isEmpty(categoryName) || !category.type) {
    throw new Error('分类名称和类型为必填项')
  }
  category.name = categoryName

  const { total } = await db.collection('category').where({
    name: category.name,
    type: category.type
  }).count()

  if (total > 0) {
    throw new BizError(`类型为“${category.type === '10' ? '收入' : '支出'}”的分类 “${category.name}” 已存在`)
  }

  const pinyinResult = pinyin(category.name, {
    pattern: 'first',
    toneType: 'none',
  })

  if (pinyinResult) {
    category.pinyin = pinyinResult.replace(/ /g, '').toUpperCase()
  }

  const result = await models.category.create({
    data: { ...category, _openid: OPENID, usedAt: Date.now() },
  })
  const { id } = result.data
  return { _id: id, ...category }
}

/**
 * 根据类型获取分类ID列表
 * @param {object} event - 云函数的原始 event 对象，包含 { query: { type } }
 * @param {object} models - 数据模型实例
 */
async function getCategoryIds(event, models) {
  const categories = await getCategories(event, models)
  if (categories && categories.length > 0) {
    return categories.map((cat) => cat._id)
  }
  return []
}

/**
 * 删除一个分类
 * @param {object} event - 云函数的原始 event 对象，包含 { id }
 * @param {object} models - 数据模型实例
 */
async function deleteCategory(event, models) {
  const { id } = event
  const { OPENID } = cloud.getWXContext()

  if (!id) {
    throw new Error('缺少分类ID')
  }

  const {
    data: { total },
  } = await models.bill.list({
    filter: {
      where: {
        category: { $eq: id },
        _openid: { $eq: OPENID },
      },
    },
    pageNumber: 1,
    pageSize: 1,
    getCount: true,
  })

  if (total > 0) {
    throw new BizError(`该分类正被 ${total} 条账单使用，无法删除`)
  }

  const { data } = await models.category.delete({
    filter: {
      where: {
        _id: { $eq: id },
        _openid: { $eq: OPENID },
      },
    },
  })

  return {
    deleted: data.count,
  }
}

/**
 * 更新一个分类
 * @param {object} event - 云函数的原始 event 对象，包含 { category }
 * @param {object} models - 数据模型实例
 */
async function updateCategory(event, models) {
  const { category } = event.body
  const { _id, ...data } = category
  const { OPENID } = cloud.getWXContext()

  if (!category || !_id) {
    throw new Error('缺少分类ID')
  }

  if (typeof data.name === 'string') {
    data.name = data.name.trim()
    if (isEmpty(data.name)) {
      throw new Error('分类名称不能为空')
    }
  }

  if (data.type === '') {
    throw new Error('分类类型不能为空')
  }

  if (data.name) {
    const { total } = await db.collection('category').where({
      _id: _.neq(_id),
      name: data.name,
      type: data.type
    }).count()

    if (total > 0) {
      throw new BizError(`类型为“${data.type === '10' ? '收入' : '支出'}”的分类 “${data.name}” 已存在`)
    }
  }

  if (data.name) {
    const pinyinResult = pinyin(data.name, {
      pattern: 'first',
      toneType: 'none',
    })
    if (pinyinResult) {
      data.pinyin = pinyinResult.replace(/ /g, '').toUpperCase()
    }
  }

  const { data: result } = await models.category.update({
    filter: {
      where: {
        _id: { $eq: _id },
        _openid: { $eq: OPENID },
      },
    },
    data: { ...data, usedAt: Date.now() },
  })

  return {
    updated: result.count,
  }
}

/**
 * 根据 ID 列表批量获取分类信息
 * @param {object} event - 云函数的原始 event 对象，包含 { query: { ids } }
 * @param {object} models - 数据模型实例
 */
async function getCategoriesByIds(event, models) {
  const { ids } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  if (!ids || ids.length === 0) {
    return []
  }

  const { data } = await models.category.list({
    filter: {
      where: {
        $and: [
          { _id: _.in(ids) },
          { $or: [{ _openid: { $eq: OPENID } }, { _openid: { $empty: true } }] },
        ],
      },
    },
    pageSize: 1000,
  })

  return data.records || []
}

/**
 * 根据名称和类型批量获取分类。
 * 如果分类不存在，则会自动为当前用户创建。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 可选的数据库或事务实例
 * @returns {Promise<Array<object>>} - 分类对象列表
 */
async function _getCategoryByNames(event, models, dbOrTransaction) {
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

module.exports = {
  getCategories,
  getCategoryIds,
  getCategoriesByIds,
  addCategory,
  deleteCategory,
  updateCategory,
  populateCategoriesForBills,
  _getCategoryByNames,
}
