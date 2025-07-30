const cloud = require('wx-server-sdk')

/**
 * 在指定集合中查找或创建文档，并返回其 _id。
 * @param {string} collectionName - 集合名称 ('category' 或 'tag')
 * @param {string} name - 要查找或创建的文档的 name 字段值
 * @returns {Promise<string>} 文档的 _id
 */
async function findOrCreate(collectionName, name) {
  try {
    const getRes = await cloud.callFunction({
      name: 'data',
      data: { $url: `/${collectionName}`, action: 'get', query: { name } },
    })

    if (getRes.result && getRes.result.data && getRes.result.data.length > 0) {
      return getRes.result.data[0]._id
    } else {
      const addRes = await cloud.callFunction({
        name: 'data',
        data: { $url: `/${collectionName}`, action: 'add', data: { name } },
      })
      if (addRes.result._id) {
        return addRes.result._id
      }
      throw new Error(`创建 ${collectionName} 失败: ${name}`)
    }
  } catch (e) {
    console.error(`findOrCreate ${collectionName} error:`, e)
    throw e
  }
}

module.exports = {
  findOrCreate,
}
