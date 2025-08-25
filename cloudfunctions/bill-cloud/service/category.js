const cloud = require('wx-server-sdk')
const db = cloud.database()
const _ = db.command
const { BizError } = require('./helper.js')
const { isEmpty } = require('lodash')

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

  // 如果只有一个查询条件，则不需要 $and
  const finalWhere = whereClauses.length > 1 ? { $and: whereClauses } : whereClauses[0]

  const { data } = await models.category.list({
    filter: { where: finalWhere },
    orderBy: [{ type: 'desc' }, { usedAt: 'desc' }, { name: 'desc' }],
    pageSize: 1000,
  })

  // 为每个分类添加 isBuiltIn 标志
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

  // 全局检查是否存在同名同类型的分类
  const { total } = await db.collection('category').where({
    name: category.name,
    type: category.type
  }).count()

  if (total > 0) {
    throw new BizError(`类型为“${category.type === '10' ? '收入' : '支出'}”的分类 “${category.name}” 已存在`)
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

  // 检查是否有账单正在使用该分类
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
        _openid: { $eq: OPENID }, // 确保只能删除自己的分类
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
    // 全局检查是否存在同名同类型的分类，并排除自身
    const { total } = await db.collection('category').where({
      _id: _.neq(_id), // 排除当前正在更新的文档
      name: data.name,
      type: data.type
    }).count()

    if (total > 0) {
      throw new BizError(`类型为“${data.type === '10' ? '收入' : '支出'}”的分类 “${data.name}” 已存在`)
    }
  }

  const { data: result } = await models.category.update({
    filter: {
      where: {
        _id: { $eq: _id },
        _openid: { $eq: OPENID }, // 确保只能更新自己的分类
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

  // 确保只能查询到自己的或公共的分类
  const { data } = await models.category.list({
    filter: {
      where: {
        $and: [
          { _id: _.in(ids) },
          { $or: [{ _openid: { $eq: OPENID } }, { _openid: { $empty: true } }] },
        ],
      },
    },
    pageSize: 1000, // 假设一次查询的ID数量不会超过1000
  })

  return data.records || []
}


module.exports = {
  getCategories,
  getCategoryIds,
  getCategoriesByIds,
  addCategory,
  deleteCategory,
  updateCategory,
}

