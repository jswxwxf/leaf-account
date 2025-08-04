/**
 * 获取所有分类
 * @param {object} models - 数据模型实例
 */
async function getCategories(event, models) {
  const { data } = await models.category.list({
    limit: 100,
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
  if (!category || !category.name) {
    throw new Error('缺少分类名称')
  }
  const result = await models.category.create({
    data: category,
  })
  const { id } = result.data
  return { _id: id, ...category }
}

module.exports = {
  getCategories,
  addCategory,
}
