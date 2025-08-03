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

  const grouped = groupBy(bills, 'datetime')

  const mapped = map(grouped, (dailyRawBills, datetime) => {
    const income = sumBy(dailyRawBills, (bill) => (bill.amount > 0 ? bill.amount : 0)) || 0
    const expense = sumBy(dailyRawBills, (bill) => (bill.amount < 0 ? Math.abs(bill.amount) : 0)) || 0

    return {
      datetime,
      day: getDayOfWeek(datetime),
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      bills: dailyRawBills,
    }
  })

  return orderBy(mapped, (item) => item.bills[0].datetime, 'desc')
}
