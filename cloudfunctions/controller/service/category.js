/**
 * 获取所有分类
 * @param {object} models - 数据模型实例
 */
async function getCategories(models) {
  try {
    const { data } = await models.category.list({
      limit: 100,
    })
    return {
      code: 200,
      message: '获取成功',
      data: data.records,
    }
  } catch (e) {
    console.error('getCategories error', e)
    return {
      code: 500,
      message: e.message || '数据库查询失败',
    }
  }
}

/**
 * 添加一个新分类
 * @param {object} category - 要添加的分类对象
 * @param {object} models - 数据模型实例
 */
async function addCategory(category, models) {
  if (!category || !category.name) {
    return { code: 400, message: '缺少分类名称' }
  }
  try {
    const result = await models.category.create({
      data: category,
    })
    const { id } = result.data
    return { code: 200, message: '添加成功', data: { _id: id, ...category } }
  } catch (e) {
    console.error('addCategory error', e)
    return {
      code: 500,
      message: e.message || '数据库添加失败',
    }
  }
}

module.exports = {
  getCategories,
  addCategory,
}
