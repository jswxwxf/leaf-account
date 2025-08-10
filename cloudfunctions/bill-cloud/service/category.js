const cloud = require('wx-server-sdk')
const db = cloud.database()
const _ = db.command

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
  const finalWhere =
    whereClauses.length > 1 ? { $and: whereClauses } : whereClauses[0]

  const { data } = await models.category.list({
    filter: { where: finalWhere },
    orderBy: [{ type: 'desc' }, { name: 'desc' }],
    pageSize: 1000,
  })
  return data.records
}

/**
 * 添加一个新分类
 * @param {object} category - 要添加的分类对象
 * @param {object} models - 数据模型实例
 */
async function addCategory(event, models) {
  const { category } = event
  const { OPENID } = cloud.getWXContext()

  if (!category || !category.name) {
    throw new Error('缺少分类名称')
  }
  const result = await models.category.create({
    data: { ...category, _openid: OPENID },
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
  const { category } = event
  const { _id, ...data } = category
  const { OPENID } = cloud.getWXContext()

  if (!category || !_id) {
    throw new Error('缺少分类ID')
  }

  const { data: result } = await models.category.update({
    filter: {
      where: {
        _id: { $eq: _id },
        _openid: { $eq: OPENID }, // 确保只能更新自己的分类
      },
    },
    data,
  })

  return {
    updated: result.count,
  }
}

module.exports = {
  getCategories,
  getCategoryIds,
  addCategory,
  deleteCategory,
  updateCategory,
}
