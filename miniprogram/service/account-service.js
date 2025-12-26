import dayjs from 'dayjs'
import { getAccountPeriod } from '@/api/account.js'

/**
 * 获取账本的所有月份，并处理业务逻辑
 * @param {string} accountId - 账本ID
 * @returns {Promise<string[]>} - 返回 YYYY-MM 格式的月份字符串数组
 */
export async function getAccountMonths(accountId) {
  const res = await getAccountPeriod(accountId)

  if (!res.data || !res.data.minDate) {
    // 如果没有账单，则只返回当前月份
    const now = dayjs()
    return [now.format('YYYY-MM')]
  }

  const { minDate, maxDate } = res.data
  const months = []
  let currentDate = dayjs(minDate)

  // 结束日期取 maxDate 和当前月份中更晚的那个
  const lastDateFromBill = dayjs(maxDate)
  const today = dayjs()
  const endDate = lastDateFromBill.isAfter(today) ? lastDateFromBill : today

  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'month')) {
    months.push(currentDate.format('YYYY-MM'))
    currentDate = currentDate.add(1, 'month')
  }

  return months.reverse()
}
