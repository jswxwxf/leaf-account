import { groupBy, sumBy, map, orderBy, some } from 'lodash'
import { getDayOfWeek, formatDate } from '@/utils/date.js'

/**
 * 生成一个新的账单对象的初始值
 * @returns {Object} 新账单对象的初始值
 */
export function newBill() {
  return {
    datetime: Date.now(),
    category: '',
    amount: '',
    note: '',
    tags: [],
  }
}

/**
 * 格式化并分组账单数据
 * @param {import('@/api/bill.js').Bill[]} bills - 原始账单列表
 * @returns {any[]}
 */
export function groupBillsByDate(bills) {
  if (!bills || bills.length === 0) return []

  // 使用 YYYY-MM-DD 格式仅根据日期进行分组，忽略时间
  const grouped = groupBy(bills, (bill) => formatDate(bill.datetime, 'YYYY-MM-DD'))

  const mapped = map(grouped, (dailyRawBills, date) => {
    const { income, expense } = dailyRawBills.reduce(
      (acc, bill) => {
        // 如果 bill.tags 存在并且包含 '非日常'，则跳过
        if (bill.tags && some(bill.tags, { name: '非日常' })) {
          return acc
        }
        if (bill.amount > 0) {
          acc.income += bill.amount
        } else if (bill.amount < 0) {
          acc.expense += Math.abs(bill.amount)
        }
        return acc
      },
      { income: 0, expense: 0 },
    )

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
