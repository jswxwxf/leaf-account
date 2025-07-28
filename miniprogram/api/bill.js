import { get, post, put, del } from './request.js'

/**
 * @typedef {object} Bill
 * @property {string} _id - 唯一标识
 * @property {string} category - 分类
 * @property {string} icon - 图标
 * @property {string} time - 时间 (HH:mm)
 * @property {string} date - 日期 (YYYY-MM-DD)
 * @property {number} amount - 金额 (支出为负, 收入为正)
 * @property {string} [note] - 备注
 * @property {string[]} [tags] - 标签
 */

const API_ENDPOINT = '/bills'

/**
 * 获取账单列表
 * @param {object} params - 查询参数
 * @param {string} [params.date_like] - 按月份筛选，例如 "2025-07"
 * @param {string} [params._sort] - 排序字段，例如 "date"
 * @param {'asc'|'desc'} [params._order] - 排序方式
 * @returns {Promise<Bill[]>}
 */
export function getBills(params = {}) {
  return get(API_ENDPOINT, params)
}

/**
 * 获取单个账单详情
 * @param {string | number} id - 账单ID
 * @returns {Promise<Bill>}
 */
export function getBill(id) {
  if (!id) return Promise.reject(new Error('缺少账单ID'))
  return get(`${API_ENDPOINT}/${id}`)
}

/**
 * 添加一个新账单
 * @param {Omit<Bill, '_id'>} bill - 账单数据
 * @returns {Promise<Bill>}
 */
export function addBill(bill) {
  return post(API_ENDPOINT, bill)
}

/**
 * 更新一个账单
 * @param {string | number} id - 要更新的账单ID
 * @param {Partial<Bill>} bill - 要更新的账单数据
 * @returns {Promise<Bill>}
 */
export function updateBill(id, bill) {
  if (!id) return Promise.reject(newError('缺少账单ID'))
  return put(`${API_ENDPOINT}/${id}`, bill)
}

/**
 * 删除一个账单
 * @param {string | number} id - 要删除的账单ID
 * @returns {Promise<object>}
 */
export function deleteBill(id) {
  if (!id) return Promise.reject(new Error('缺少账单ID'))
  return del(`${API_ENDPOINT}/${id}`)
}
