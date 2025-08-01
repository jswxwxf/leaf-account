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

module.exports = {
  getCategories,
}
