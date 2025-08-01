import { get } from './request-cloud.js'

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
  return get('controller', { $url: '/get/tags' })
}
