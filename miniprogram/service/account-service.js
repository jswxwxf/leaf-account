import dayjs from 'dayjs'
import { getAccountPeriod } from '@/api/account.js'

/**
 * 获取账本的所有月份，并处理业务逻辑
 * @param {string} accountId - 账本ID
 * @returns {Promise<number[]>} - 返回月份时间戳数组
 */
export async function getAccountMonths(accountId) {
  const res = await getAccountPeriod(accountId)

  if (!res.data || !res.data.minDate) {
    // 如果没有账单，则只返回当前月份
    const now = dayjs()
    return [now.valueOf()]
  }

  const { minDate, maxDate } = res.data
  const start = dayjs(minDate).startOf('month')

  // 结束日期取 maxDate 和当前月份中更晚的那个
  const lastDateFromBill = dayjs(maxDate).startOf('month')
  const today = dayjs().startOf('month')
  const end = lastDateFromBill.isAfter(today) ? lastDateFromBill : today

  const monthCount = end.diff(start, 'month') + 1

  return Array.from({ length: monthCount }, (_, index) => {
    return start.add(index, 'month').valueOf()
  }).reverse()
}

/**
 * 获取所有账本的月份选项列表
 * @returns {Promise<string[]>} - 返回格式化的月份字符串数组
 */
export async function getAllMonths() {
  const res = await getAccountPeriod()
  const { minDate, maxDate } = res.data

  if (!minDate || !maxDate) {
    return
  }

  const start = dayjs(minDate).startOf('month')
  const end = dayjs(maxDate).startOf('month')
  const monthCount = end.diff(start, 'month') + 1

  return Array.from({ length: monthCount }, (_, index) => {
    return start.add(index, 'month').format('YYYY年MM月')
  }).reverse()
}
