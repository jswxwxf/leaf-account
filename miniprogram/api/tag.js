import { get, post } from './request-cloud.js'

/**
 * @typedef {object} Tag
 * @property {string} _id - 唯一标识
 * @property {string} name - 标签名称
 */

/**
 * 获取所有标签
 * @returns {Promise<Tag[]>}
 */
export function getTags() {
  return get('bill-cloud', { $url: '/get/tags' })
}

/**
 * 更新一个标签
 * @param {object} tag - 标签数据
 * @returns {Promise<any>}
 */
export function updateTag(tag) {
  return post('bill-cloud', {
    $url: '/put/tag',
    body: { tag },
  })
}

/**
 * 添加一个新标签
 * @param {object} tag - 标签数据
 * @returns {Promise<any>}
 */
export function addTag(tag) {
  return post('bill-cloud', {
    $url: '/post/tag',
    body: { tag },
  })
}


/**
 * 批量添加新标签
 * @param {Array<object>} tags - 标签对象数组
 * @returns {Promise<any>}
 */
export function addTags(tags) {
  return post('bill-cloud', {
    $url: '/post/tags',
    body: { tags },
  })
}

/**
 * 删除一个标签
 * @param {string} id - 标签ID
 * @returns {Promise<any>}
 */
export function deleteTag(id) {
  return post('bill-cloud', {
    $url: '/delete/tag',
    id,
  })
}
