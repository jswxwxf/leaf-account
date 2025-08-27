import { get, post } from './request-cloud.js'
import { getMonthRange } from '@/utils/date.js'

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
  const finalQuery = { ...query }

  if (finalQuery.month) {
    const { startTime, endTime } = getMonthRange(finalQuery.month)
    finalQuery.startTime = startTime
    finalQuery.endTime = endTime
    delete finalQuery.month
  }

  return get('bill-cloud', {
    $url: '/get/bills',
    query: finalQuery,
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
  const finalQuery = { ...query }

  if (finalQuery.month) {
    const { startTime, endTime } = getMonthRange(finalQuery.month)
    finalQuery.startTime = startTime
    finalQuery.endTime = endTime
    delete finalQuery.month
  }

  return post('bill-cloud', {
    $url: '/upsert/bill',
    query: finalQuery,
    body: { bill },
  })
}

/**
 * 批量更新账单
 * @param {object} query - 查询条件，用于筛选要更新的账单，例如 { ids: [...] }
 * @param {object} data - 要更新的数据
 * @returns {Promise<any>}
 */
export function updateBills(query = {}, data) {
  const finalQuery = { ...query }

  if (finalQuery.month) {
    const { startTime, endTime } = getMonthRange(finalQuery.month)
    finalQuery.startTime = startTime
    finalQuery.endTime = endTime
    delete finalQuery.month
  }
  return post('bill-cloud', {
    $url: '/batch/bills/update',
    query: finalQuery,
    body: data,
  })
}

/**
 * 批量保存账单
 * @param {Bill[]} bills - 账单列表
 * @returns {Promise<any>}
 */
export function saveBills(bills, query = {}) {
  const finalQuery = { ...query }

  if (finalQuery.month) {
    const { startTime, endTime } = getMonthRange(finalQuery.month)
    finalQuery.startTime = startTime
    finalQuery.endTime = endTime
    delete finalQuery.month
  }
  return post('bill-cloud', {
    $url: '/batch/bills',
    query: finalQuery,
    body: { bills },
  })
}

/**
 * 保存转账记录
 * @param {object} data
 * @param {object} data.targetAccount - 目标账户
 * @param {number} data.amount - 金额
 * @param {('10'|'20')} data.type - 类型：10-转入，20-转出
 * @param {object} query - 查询参数，如 accountId (源账户ID)
 * @returns {Promise<any>}
 */
export function saveTransfer(body, query = {}) {
  return post('bill-cloud', {
    $url: '/post/transfer',
    query,
    body,
  })
}

/**
 * 删除一个账单
 * @param {string} id - 账单的 _id
 * @returns {Promise<any>}
 */
export function deleteBill(id, query = {}) {
  const finalQuery = { ...query }

  if (finalQuery.month) {
    const { startTime, endTime } = getMonthRange(finalQuery.month)
    finalQuery.startTime = startTime
    finalQuery.endTime = endTime
    delete finalQuery.month
  }
  return post('bill-cloud', {
    $url: '/delete/bill',
    query: finalQuery,
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
