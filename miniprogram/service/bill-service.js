import { formatDate, getDayOfWeek } from '@/utils/date.js'
import { groupBy, isEmpty, map, orderBy, some, sumBy } from 'lodash'
import { formatMoney } from '@/utils/index.js'
import dayjs from 'dayjs'

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

/**
 * 生成日度账单汇总文本
 * @param {import('@/api/bill.js').Bill[]} bills - 原始账单列表
 * @param {number} totalIncome - 总收入
 * @param {number} totalExpense - 总支出
 * @param {number} balance - 账户余额
 * @returns {string}
 */
export function generateSummaryText(bills, totalIncome, totalExpense, balance) {
  const { daily } = (bills || []).reduce(
    (acc, bill) => {
      const amount = bill.amount || 0
      const date = formatDate(bill.datetime, 'YYYY-MM-DD')

      if (!acc.daily[date]) {
        acc.daily[date] = { income: 0, expense: 0, lines: [] }
      }

      const line = [bill.category?.name, formatMoney(amount), bill.note].join('\t')
      acc.daily[date].lines.push('  ' + line)

      if (bill.category.type === '10') {
        acc.daily[date].income += amount
      } else {
        acc.daily[date].expense += amount
      }

      return acc
    },
    { daily: {} },
  )

  const summaryText = Object.entries(daily)
    .map(([date, summary]) => {
      const header = `${date} 收: ${formatMoney(summary.income)} 支: ${formatMoney(
        summary.expense,
      )}`
      return [header + '\n', ...summary.lines].join('\n')
    })
    .join('\n\n')

  return [
    isEmpty(summaryText) ? '还没有录入账单' : summaryText,
    `\n\n总收: ${formatMoney(totalIncome)}`,
    `总支: ${formatMoney(totalExpense)}`,
    `总余: ${formatMoney(balance)}`,
  ].join('\n')
}

/**
 * 检查单个账单是否匹配所有查询条件
 * @param {import('@/api/bill.js').Bill} bill - 要检查的账单
 * @param {object} query - 查询条件
 * @returns {boolean}
 */
export function isBillMatch(bill, query) {
  const { categories, minAmount, maxAmount, note, tags } = query

  // 1. 分类检查
  if (categories && categories.length > 0) {
    const normalCategories = categories.filter((c) => !c.isAll)
    const allCategories = categories.filter((c) => c.isAll)

    let isMatch = false

    // 检查是否匹配任何一个普通分类
    if (normalCategories.length > 0) {
      const normalCategoryIds = normalCategories.map((c) => c._id)
      if (normalCategoryIds.includes(bill.category._id)) {
        isMatch = true
      }
    }

    // 如果尚未匹配，检查是否匹配任何一个“所有”分类的类型
    if (!isMatch && allCategories.length > 0) {
      if (allCategories.some((ac) => ac.type === bill.category.type)) {
        isMatch = true
      }
    }

    // 如果有分类筛选但最终没有匹配上，则返回 false
    if (!isMatch) {
      return false
    }
  }

  // 2. 金额范围检查
  if (minAmount !== undefined && bill.amount < minAmount) return false
  if (maxAmount !== undefined && bill.amount > maxAmount) return false

  // 3. 备注文本检查
  if (note && bill.note && !bill.note.includes(note)) return false

  // 4. 标签检查 (只要有一个匹配即可)
  if (tags && tags.length > 0) {
    if (!bill.tags || bill.tags.length === 0) return false
    const queryTagIds = tags.map((t) => t._id)
    if (!bill.tags.some((tag) => queryTagIds.includes(tag._id))) {
      return false
    }
  }

  return true
}
