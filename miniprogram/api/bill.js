import { get, post } from './request-cloud.js'

/**
 * @typedef {object} Bill
 * @property {string} _id - 唯一标识
 * @property {string} category - 分类
 * @property {string} datetime - 日期时间 (YYYY-MM-DD HH:mm)
 * @property {number} amount - 金额 (支出为负, 收入为正)
 * @property {string} [note] - 备注
 * @property {string[]} [tags] - 标签
 */

/**
 * 获取账单列表
 * @param {object} params - 查询参数
 * @returns {Promise<Bill[]>}
 */
export function getBills(query = {}) {
  return get('controller', {
    $url: '/get/bills',
    query,
  })
}

/**
 * 创建或更新一个账单
 * @param {Omit<Bill, '_id'> | Bill} bill - 账单数据
 * @returns {Promise<any>}
 */
export function upsertBill(bill) {
  return post('controller', {
    $url: '/upsert/bill',
    bill,
  })
}
