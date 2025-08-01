const cloud = require('wx-server-sdk')
const db = cloud.database()

/**
 * 获取所有标签
 */
async function getTags() {
  try {
    // 默认最多获取 100 条，对于标签来说足够了
    const { data } = await db.collection('tag').limit(100).get()
    return {
      code: 200,
      message: '获取成功',
      data,
    }
  } catch (e) {
    console.error('getTags error', e)
    return {
      code: 500,
      message: e.message || '数据库查询失败',
    }
  }
}

module.exports = {
  getTags,
}
