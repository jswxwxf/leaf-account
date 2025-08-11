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
 * 获取所有账单
 * @param {object} query - 查询参数
 * @returns {Promise<Bill[]>}
 */
export function getBills(query = {}) {
  return get('bill-cloud', {
    $url: '/get/bills',
    query,
  })
}


/**
 * 获取所有账单
 * @param {object} query - 查询参数
 * @returns {Promise<Bill[]>}
 */
export function getAllBills(query = {}) {
  return get('bill-cloud', {
    $url: '/get/bills/all',
    query,
  })
}

/**
 * 创建或更新一个账单
 * @param {Omit<Bill, '_id'> | Bill} bill - 账单数据
 * @returns {Promise<any>}
 */
export function upsertBill(bill, query = {}) {
  return post('bill-cloud', {
    $url: '/upsert/bill',
    query,
    body: { bill },
  })
}

/**
 * 批量保存账单
 * @param {Bill[]} bills - 账单列表
 * @returns {Promise<any>}
 */
export function saveBills(bills, query = {}) {
  return post('bill-cloud', {
    $url: '/batch/bills',
    query,
    body: { bills },
  })
}

/**
 * 删除一个账单
 * @param {string} id - 账单的 _id
 * @returns {Promise<any>}
 */
export function deleteBill(id, query = {}) {
  return post('bill-cloud', {
    $url: '/delete/bill',
    query,
    id,
  })
}

/**
 * 清空所有账单并重置账户
 * @returns {Promise<any>}
 */
export function resetBills() {
  return post('bill-cloud', {
    $url: '/delete/reset-bills',
  })
}
