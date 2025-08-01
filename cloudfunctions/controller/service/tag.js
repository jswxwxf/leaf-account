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

/**
 * 批量添加新标签。如果标签已存在，则返回现有标签。
 * @param {Array<object>} tags - 要添加的标签对象数组
 */
async function addTags(tags) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return { code: 400, message: '缺少标签数据' }
  }
  try {
    const result = await db.runTransaction(async (transaction) => {
      const newDocs = []
      const tagCollection = transaction.collection('tag')

      for (const tag of tags) {
        // 检查标签是否已存在，避免重复
        const { data: existing } = await tagCollection.where({ name: tag.name }).get()
        if (existing && existing.length > 0) {
          newDocs.push(existing[0])
        } else {
          const { _id } = await tagCollection.add({
            data: tag,
          })
          newDocs.push({ _id, ...tag })
        }
      }
      return newDocs
    })
    return { code: 200, message: '批量处理成功', data: result }
  } catch (e) {
    console.error('addTags transaction error', e)
    return {
      code: 500,
      message: e.message || '数据库批量添加失败',
    }
  }
}

module.exports = {
  getTags,
  addTags,
}
