import { get, post } from './request-cloud.js'
import { getMonthRange } from '@/utils/date.js'
import dayjs from '@/vendor/dayjs/esm/index.js'

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
 * 处理前端查询参数，转换为后端云函数可识别的格式
 * - 将 month 转换为 startTime 和 endTime
 * - 将 categories 数组（可能包含 isAll 对象）转换为 categories ID 数组和 type
 * - 将 tags 数组转换为 tags ID 数组
 * @param {object} query - 前端传递的查询对象
 * @returns {object} - 处理后的查询对象
 */
function processQuery(query) {
  const finalQuery = { ...query }
  // 处理月份范围
  if (finalQuery.month) {
    const { startTime, endTime } = getMonthRange(finalQuery.month)
    finalQuery.startTime = startTime
    finalQuery.endTime = endTime
    delete finalQuery.month
  }

  // 处理分类
  if (finalQuery.categories && Array.isArray(finalQuery.categories)) {
    const allCategory = finalQuery.categories.find((c) => c.isAll)
    const normalCategories = finalQuery.categories.filter((c) => !c.isAll)

    if (allCategory) {
      finalQuery.type = allCategory.type
    }

    if (normalCategories.length > 0) {
      finalQuery.categories = normalCategories.map((c) => c._id)
    } else {
      // 如果只选择了“所有”，则删除 categories 属性，仅按 type 筛选
      delete finalQuery.categories
    }
  }

  // 处理标签
  if (finalQuery.tags && Array.isArray(finalQuery.tags)) {
    finalQuery.tags = finalQuery.tags.map((t) => t._id)
  }

  return finalQuery
}

/**
 * 获取所有账单
 * @param {object} query - 查询参数
 * @returns {Promise<Bill[]>}
 */
export function getBills(query = {}) {
  return get('bill-cloud', {
    $url: '/get/bills',
    query: processQuery(query),
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
    query: processQuery(query),
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
  return post('bill-cloud', {
    $url: '/batch/bills/update',
    query: processQuery(query),
    body: data,
  })
}

/**
 * 批量删除账单
 * @param {object} query - 查询条件，用于筛选要删除的账单，例如 { ids: [...] }
 * @returns {Promise<any>}
 */
export function deleteBills(query = {}) {
  return post('bill-cloud', {
    $url: '/batch/bills/delete',
    query: processQuery(query),
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
    query: processQuery(query),
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
  return post('bill-cloud', {
    $url: '/delete/bill',
    query: processQuery(query),
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

/**
 * 按指定维度对账单进行分组
 * @param {object} query - 查询参数，同 getBills
 * @param {string} dimension - 分组维度 ('category' 或 'month')
 * @returns {Promise<any>}
 */
export function groupBillsBy(dimension, query = {}) {
  if (!dimension) {
    throw new Error('groupBillsBy 函数需要 dimension 参数')
  }
  if (query.month) {
    query.month = dayjs().year() + '年' + query.month + '月'
  }
  return get('bill-cloud', {
    $url: '/group/bills',
    query: processQuery({ ...query, by: dimension }),
  })
}
