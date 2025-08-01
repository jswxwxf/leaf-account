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

  const grouped = groupBy(bills, 'date')

  const mapped = map(grouped, (dailyRawBills, date) => {
    const income = sumBy(dailyRawBills, (bill) => (bill.amount > 0 ? bill.amount : 0))
    const expense = sumBy(dailyRawBills, (bill) => (bill.amount < 0 ? Math.abs(bill.amount) : 0))

    return {
      date: DateTime.fromISO(date).toFormat('MM月dd日'),
      day: getDayOfWeek(date),
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      bills: dailyRawBills,
    }
  })

  return orderBy(mapped, (item) => item.bills[0].date, 'desc')
}
