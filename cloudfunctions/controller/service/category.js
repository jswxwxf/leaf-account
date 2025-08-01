const cloud = require('wx-server-sdk')
const db = cloud.database()

/**
 * 获取所有分类
 */
async function getCategories() {
  try {
    const { data } = await db.collection('category').limit(100).get()
    return {
      code: 200,
      message: '获取成功',
      data,
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
 */
async function addCategory(category) {
  if (!category || !category.name) {
    return { code: 400, message: '缺少分类名称' }
  }
  try {
    const { _id } = await db.collection('category').add({
      data: category,
    })
    return { code: 200, message: '添加成功', data: { _id, ...category } }
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
