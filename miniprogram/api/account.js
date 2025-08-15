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
 * @param {string} [name='default'] - 账本名称
 * @returns {Promise<Account>}
 */
export function getAccount(name = 'leaf-maple') {
  return get('bill-cloud', {
    $url: '/get/account',
    query: { name },
  })
}

/**
 * 获取所有可用账本列表
 * @returns {Promise<Account[]>}
 */
export function getAccounts() {
  return get('bill-cloud', {
    $url: '/get/accounts',
  })
}

/**
 * 对账
 * @param {number} actualBalance - 实际余额
 * @returns {Promise<Account>}
 */
export function reconcileAccount(actualBalance, accountId) {
  return post('bill-cloud', {
    $url: '/put/account/reconcile',
    query: {
      actualBalance,
      accountId,
    },
  })
}

/**
 * 更新账本信息
 * @param {string} accountId - 账本ID
 * @param {object} data - 要更新的数据，例如 { title: '新的标题' }
 * @returns {Promise<any>}
 */
export function updateAccount(accountId, data) {
  return post('bill-cloud', {
    $url: '/put/account',
    body: data,
    query: {
      accountId,
    },
  })
}
