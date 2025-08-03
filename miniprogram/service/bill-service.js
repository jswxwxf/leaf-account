import { groupBy, sumBy, map, orderBy } from 'lodash'
import { DateTime, getDayOfWeek } from '@/utils/date.js'

/**
 * 生成一个新的账单对象的初始值
 * @returns {Object} 新账单对象的初始值
 */
export function newBill() {
  return {
    amount: '',
    datetime: Date.now(),
    note: '',
    tags: [],
    category: null,
  }
}

/**
 * 格式化并分组账单数据
 * @param {import('@/api/bill.js').Bill[]} bills - 原始账单列表
 * @returns {any[]}
 */
export function groupBillsByDate(bills) {
  if (!bills || bills.length === 0) return []

  // 使用 toISODate() 仅根据日期进行分组，忽略时间
  const grouped = groupBy(bills, (bill) => DateTime.fromMillis(bill.datetime).toISODate())

  const mapped = map(grouped, (dailyRawBills, date) => {
    const income = sumBy(dailyRawBills, (bill) => (bill.amount > 0 ? bill.amount : 0)) || 0
    const expense = sumBy(dailyRawBills, (bill) => (bill.amount < 0 ? Math.abs(bill.amount) : 0)) || 0

    return {
      datetime: dailyRawBills[0].datetime,
      day: getDayOfWeek(date),
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      // 确保组内的账单按时间倒序排列
      bills: orderBy(dailyRawBills, 'datetime', 'desc'),
    }
  })

  // 按日期倒序排列所有分组
  return orderBy(mapped, 'datetime', 'desc')
}
