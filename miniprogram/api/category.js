import { get, post } from './request-cloud.js'

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
export function getCategories(query = {}) {
  return get('bill-cloud', { $url: '/get/categories', query })
}

/**
 * 更新一个分类
 * @param {object} category - 分类数据
 * @returns {Promise<any>}
 */
export function updateCategory(category) {
  return post('bill-cloud', {
    $url: '/put/category',
    body: { category },
  })
}

/**
 * 添加一个新分类
 * @param {object} category - 分类数据
 * @returns {Promise<any>}
 */
export function addCategory(category) {
  return post('bill-cloud', {
    $url: '/post/category',
    body: { category },
  })
}

/**
 * 删除一个分类
 * @param {string} id - 分类ID
 * @returns {Promise<any>}
 */
export function deleteCategory(id) {
  return post('bill-cloud', {
    $url: '/delete/category',
    id,
  })
}
