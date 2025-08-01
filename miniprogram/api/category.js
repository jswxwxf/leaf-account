import { get } from './request-cloud.js'

/**
 * @typedef {object} Category
 * @property {string} _id - 唯一标识
 * @property {string} name - 分类名称
 * @property {string} type - 类型 ('10' for income, '20' for expense)
 */

/**
 * 获取所有分类
 * @returns {Promise<Category[]>}
 */
export function getCategories() {
  return get('controller', { $url: '/get/categories' })
}
