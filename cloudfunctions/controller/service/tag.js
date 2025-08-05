const cloud = require('wx-server-sdk')
const db = cloud.database()
const _ = db.command

/**
 * 获取所有标签
 * @param {object} models - 数据模型实例
 */
async function getTags(event, models) {
  const { OPENID } = cloud.getWXContext()
  // 权限：只能获取自己的或公共的
  const where = {
    $or: [{ _openid: { $eq: OPENID } }, { _openid: { $empty: true } }],
  }

  // 默认最多获取 100 条，对于标签来说足够了
  const { data } = await models.tag.list({
    filter: { where },
    orderBy: [{ type: 'asc' }],
    limit: 100,
  })
  return data.records
}

/**
 * 批量添加新标签。如果标签已存在，则返回现有标签。
 * @param {Array<object>} tags - 要添加的标签对象数组
 * @param {object} models - 数据模型实例
 */
async function addTags(event, models) {
  const { tags } = event
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('无法获取用户身份')
  }

  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    throw new Error('缺少标签数据')
  }
  const tagsToSave = tags.map((tag) => ({ ...tag, _openid: OPENID }))
  const result = await models.tag.createMany({
    data: tagsToSave,
  })

  // 根据 createMany 的返回，用 idList 重新查询以获取完整数据
  const { idList } = result.data
  if (!idList || idList.length === 0) {
    return []
  }

  const {
    data: { records: createdTags },
  } = await models.tag.list({
    filter: {
      where: {
        _id: { $in: idList },
      },
    },
  })

  return createdTags
}

module.exports = {
  getTags,
  addTags,
}
