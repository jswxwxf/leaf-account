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
export function getAccounts(query) {
  return get('bill-cloud', {
    $url: '/get/accounts',
    query,
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
    body: {
      actualBalance,
    },
    query: {
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

/**
 * 永久删除账本及其所有关联账单
 * @param {string} accountId - 要删除的账本ID
 * @returns {Promise<any>}
 */
export function deactivateAccount(accountId) {
  return post('bill-cloud', {
    $url: '/delete/account',
    query: {
      accountId,
    },
  })
}

/**
 * 导出账本数据
 * @param {string} accountId - 账本ID
 * @param {number} year - 年份
 * @returns {Promise<any>}
 */
export function exportAccount(accountId) {
  return post('bill-cloud', {
    $url: '/post/account/export',
    query: {
      accountId,
    },
  })
}

/**
 * 导入账本数据
 * @param {string} accountId - 账本ID
 * @param {string} fileID - 文件ID
 * @returns {Promise<any>}
 */
export function importAccount(accountId, fileID) {
  return post('bill-cloud', {
    $url: '/post/account/import',
    query: {
      accountId,
      fileID,
    },
  })
}

/**
 * 获取账本的所有年份
 * @param {string} accountId - 账本ID
 * @returns {Promise<number[]>}
 */
export function getAccountYears(accountId) {
  return get('bill-cloud', {
    $url: '/get/account/years',
    query: {
      accountId,
    },
  })
}

/**
 * 获取账本的账单时间范围
 * @param {string} accountId - 账本ID
 * @returns {Promise<{minDate: number, maxDate: number}>}
 */
export function getAccountPeriod(accountId) {
  return get('bill-cloud', {
    $url: '/get/account/period',
    query: {
      accountId,
    },
  })
}
