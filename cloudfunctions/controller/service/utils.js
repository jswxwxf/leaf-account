/**
 * 在指定集合中查找或创建文档，并返回其 _id。
 * @param {object} dbOrTransaction - 数据库实例或事务对象
 * @param {string} collectionName - 集合名称 ('category' 或 'tag')
 * @param {string} name - 要查找或创建的文档的 name 字段值
 * @param {object} [data={}] - 创建新文档时要合并的数据
 * @returns {Promise<string>} 文档的 _id
 */
async function findOrCreate(dbOrTransaction, collectionName, name, data = {}) {
  try {
    const collection = dbOrTransaction.collection(collectionName)
    const { data: existing } = await collection.where({ name }).get()

    if (existing && existing.length > 0) {
      return existing[0]._id
    } else {
      const docToCreate = { name, ...data }
      const { _id } = await collection.add({
        data: docToCreate,
      })
      if (_id) {
        return _id
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
