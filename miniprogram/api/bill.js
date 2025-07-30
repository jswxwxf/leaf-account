import { get } from './request.js'
import { post } from './request-cloud.js'

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
  const defaultParams = {
    _sort: '-date,-time',
    ...params,
  }
  return get(API_ENDPOINT, defaultParams)
}

/**
 * 创建或更新一个账单（通过云函数）
 * @param {Omit<Bill, '_id'> | Bill} bill - 账单数据
 * @returns {Promise<any>}
 */
export function upsertBill(bill) {
  return post('controller', {
    $url: '/upsert/bill',
    bill,
  })
}
