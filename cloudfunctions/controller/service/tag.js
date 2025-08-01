/**
 * 获取所有标签
 * @param {object} models - 数据模型实例
 */
async function getTags(models) {
  try {
    // 默认最多获取 100 条，对于标签来说足够了
    const { data } = await models.tag.list({
      limit: 100,
    })
    return {
      code: 200,
      message: '获取成功',
      data: data.records,
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
 * @param {object} models - 数据模型实例
 */
async function addTags(tags, models) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return { code: 400, message: '缺少标签数据' }
  }
  try {
    // 使用 models.tag.createMany 进行批量创建
    const result = await models.tag.createMany({
      data: tags,
    })
    // 根据 addCategory 的修复方式，我们假设 createMany 返回一个包含 ids 的 data 对象
    const { idList } = result.data
    const createdTags = tags.map((tag, i) => ({
      ...tag,
      _id: idList[i],
    }))
    return { code: 200, message: '批量添加成功', data: createdTags }
  } catch (e) {
    console.error('addTags error', e)
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
