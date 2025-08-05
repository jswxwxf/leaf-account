import { get } from './request-cloud.js'

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
  return get('controller', {
    $url: '/get/account',
  })
}
