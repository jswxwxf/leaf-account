import { get, post } from './request-cloud.js'

/**
 * @typedef {object} Account
 * @property {string} _id - 唯一标识
 * @property {string} userId - 用户ID
 * @property {string} name - 账本名
 * @property {number} balance - 余额
 * @property {number} totalIncome - 总收入
 * @property {number} totalExpense - 总支出
 */

/**
 * 获取用户账户信息
 * @returns {Promise<Account>}
 */
export function getAccount() {
  return get('bill-cloud', {
    $url: '/get/account',
  })
}

/**
 * 对账
 * @param {number} actualBalance - 实际余额
 * @returns {Promise<Account>}
 */
export function reconcileAccount(actualBalance) {
  return post('bill-cloud', {
    $url: '/put/account/reconcile',
    actualBalance,
  })
}
