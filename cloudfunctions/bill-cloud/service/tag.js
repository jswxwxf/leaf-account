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
    orderBy: [{ _openid: 'asc' }, { type: 'asc' }],
    limit: 100,
  })

  // 为每个标签添加 isBuiltIn 标志
  const recordsWithFlag = data.records.map((record) => ({
    ...record,
    isBuiltIn: !record._openid,
  }))

  return recordsWithFlag
}

/**
 * 批量添加新标签。如果标签已存在，则返回现有标签。
 * @param {Array<object>} tags - 要添加的标签对象数组
 * @param {object} models - 数据模型实例
 */
async function addTags(event, models) {
  const { tags } = event.body
  const { OPENID } = cloud.getWXContext()

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

/**
 * 添加单个标签
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function addTag(event, models) {
  const { tag } = event.body
  const { OPENID } = cloud.getWXContext()

  if (!tag || !tag.name) {
    throw new Error('缺少标签名称')
  }

  const tagToSave = { ...tag, _openid: OPENID }
  const result = await models.tag.create({ data: tagToSave })
  return result
}

/**
 * 更新单个标签
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function updateTag(event, models) {
  const { tag } = event.body
  const { OPENID } = cloud.getWXContext()

  if (!tag || !tag._id) {
    throw new Error('缺少标签 ID')
  }
  if (!tag.name) {
    throw new Error('缺少标签名称')
  }

  const tagId = tag._id
  delete tag._id

  // 使用 filter 来更新，同时完成权限校验
  const {
    data: { count },
  } = await models.tag.update({
    filter: {
      where: {
        _id: { $eq: tagId },
        _openid: { $eq: OPENID }, // 确保只能更新自己的标签
      },
    },
    data: { ...tag, updatedBy: OPENID },
  })

  return { updated: count }
}

module.exports = {
  getTags,
  addTags,
  addTag,
  updateTag,
  deleteTag,
}

/**
 * 删除单个标签
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function deleteTag(event, models) {
  const { id } = event
  const { OPENID } = cloud.getWXContext()

  if (!id) {
    throw new Error('缺少标签 ID')
  }

  // 检查是否有账单正在使用该标签
  const {
    data: { total },
  } = await models.bill.list({
    filter: {
      where: {
        tags: { $in: [id] },
        _openid: { $eq: OPENID },
      },
    },
    pageNumber: 1,
    pageSize: 1,
    getCount: true,
  })

  if (total > 0) {
    throw new BizError(`该标签正被 ${total} 条账单使用，无法删除`)
  }

  const {
    data: { count },
  } = await models.tag.delete({
    filter: {
      where: {
        _id: { $eq: id },
        _openid: { $eq: OPENID }, // 确保只能删除自己的标签
      },
    },
  })

  return {
    deleted: count,
  }
}
