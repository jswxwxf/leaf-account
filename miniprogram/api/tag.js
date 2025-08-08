import { get, post } from './request-cloud.js'

/**
 * @typedef {object} Tag
 * @property {string} _id - 唯一标识
 * @property {string} name - 标签名称
 * @property {string} type - 类型
 */

/**
 * 获取所有标签
 * @returns {Promise<Tag[]>}
 */
export function getTags() {
  return get('bill-cloud', { $url: '/get/tags' })
}

/**
 * 批量添加新标签
 * @param {Array<object>} tags - 标签对象数组
 * @returns {Promise<any>}
 */
export function addTags(tags) {
  return post('bill-cloud', {
    $url: '/post/tags',
    tags,
  })
}
