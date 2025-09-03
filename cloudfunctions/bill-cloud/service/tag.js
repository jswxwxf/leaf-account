const cloud = require('wx-server-sdk')
const db = cloud.database()
const _ = db.command
const { isEmpty } = require('lodash')

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

  const tagsToSave = tags.map((tag) => {
    const tagName = tag.name?.trim()
    if (isEmpty(tagName) || !tag.type) {
      throw new Error('标签的名称和类型为必填项')
    }
    return { ...tag, name: tagName, _openid: OPENID }
  })
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

  const tagName = tag?.name?.trim()
  if (!tag || isEmpty(tagName) || !tag.type) {
    throw new Error('标签名称和类型为必填项')
  }

  const tagToSave = { ...tag, name: tagName, _openid: OPENID }
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

  if (typeof tag.name === 'string') {
    tag.name = tag.name.trim()
    if (isEmpty(tag.name)) {
      throw new Error('标签名称不能为空')
    }
  }

  if (tag.type === '') {
    throw new Error('标签类型不能为空')
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

/**
 * 根据 ID 列表获取标签详情
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getTagsByIds(event, models) {
  const { ids } = event.query

  if (!ids || ids.length === 0) {
    return []
  }

  const {
    data: { records: tags },
  } = await models.tag.list({
    filter: { where: { _id: { $in: ids } } },
    select: { _id: true, name: true, type: true },
    pageSize: 1000,
  })

  return tags
}

async function getTagsByNames(event, models) {
  return _getTagsByNames(event, models, db)
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


/**
 * 根据名称批量获取标签。
 * 如果标签不存在，则会自动为当前用户创建。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 可选的数据库或事务实例
 * @returns {Promise<Array<object>>} - 标签对象列表
 */
async function _getTagsByNames(event, models, dbOrTransaction) {
  const { names } = event.query || {}
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!names || names.length === 0) {
    return []
  }

  const finalTags = []
  const tagMap = new Map()

  // 1. 查找私有标签
  const { data: privateTags } = await dbInstance
    .collection('tag')
    .where({
      _openid: OPENID,
      name: _.in(names),
    })
    .get()

  for (const tag of privateTags) {
    if (!tagMap.has(tag.name)) {
      finalTags.push(tag)
      tagMap.set(tag.name, tag)
    }
  }

  // 2. 查找公共标签
  const remainingNames = names.filter((name) => !tagMap.has(name))
  if (remainingNames.length > 0) {
    const { data: publicTags } = await dbInstance
      .collection('tag')
      .where({
        _openid: _.exists(false),
        name: _.in(remainingNames),
      })
      .get()

    for (const tag of publicTags) {
      if (!tagMap.has(tag.name)) {
        finalTags.push(tag)
        tagMap.set(tag.name, tag)
      }
    }
  }

  // 3. 创建新的私有标签
  const tagsToCreate = names.filter((name) => !tagMap.has(name))
  if (tagsToCreate.length > 0) {
    const newTagsData = tagsToCreate.map((name) => ({
      name,
      _openid: OPENID,
      createdAt: Date.now(),
    }))

    const createResult = await dbInstance.collection('tag').add({
      data: newTagsData,
    })

    const { data: newCreatedTags } = await dbInstance
      .collection('tag')
      .where({
        _id: _.in(createResult._ids),
      })
      .get()

    finalTags.push(...newCreatedTags)
  }

  return finalTags
}

/**
 * 为账单列表填充完整的标签对象。
 * @param {Array<object>} bills - 账单列表，其中 tags 字段为 ID 数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<Array<object>>} - 填充了完整标签对象的账单列表
 */
async function populateTagsForBills(bills, models) {
  if (bills.length > 0) {
    const allTagIds = [...new Set(bills.flatMap((bill) => bill.tags || []).filter(Boolean))]

    if (allTagIds.length > 0) {
      const tags = await getTagsByIds({ query: { ids: allTagIds } }, models)
      const tagsMap = new Map(tags.map((tag) => [tag._id, tag]))

      bills.forEach((bill) => {
        if (Array.isArray(bill.tags)) {
          bill.tags = bill.tags.map((tagId) => tagsMap.get(tagId)).filter(Boolean)
        }
      })
    }
  }
  return bills
}

module.exports = {
  getTags,
  addTags,
  addTag,
  updateTag,
  deleteTag,
  getTagsByIds,
  _getTagsByNames,
  getTagsByNames,
  populateTagsForBills
}
