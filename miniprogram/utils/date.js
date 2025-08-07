import dayjs from '@/vendor/dayjs/esm/index.js'
import '@/vendor/dayjs/locale/zh-cn.js'
import isToday from '@/vendor/dayjs/plugin/isToday.js'
import isYesterday from '@/vendor/dayjs/plugin/isYesterday.js'

dayjs.locale('zh-cn')
dayjs.extend(isToday)
dayjs.extend(isYesterday)

/**
 * 获取日期是星期几
 * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
 * @returns {string}
 */
export function getDayOfWeek(dateString) {
  const date = dayjs(dateString)
  if (date.isToday()) {
    return '今天'
  }
  if (date.isYesterday()) {
    return '昨天'
  }
  return date.format('dddd')
}

/**
 * 格式化日期
 * @param {Date | number | string} date - 日期对象、时间戳或字符串
 * @param {string} fmt - 格式字符串，例如 'YYYY-MM-DD HH:mm:ss'
 * @returns {string}
 */
export function formatDate(date, fmt) {
  if (!date) return ''
  return dayjs(date).format(fmt)
}

/**
 * 获取当前月份的字符串，格式为 'YYYY-MM'
 * @returns {string}
 */
export function getCurrentMonth() {
  return dayjs().format('YYYY-MM')
}

export function parseDate(dateString) {
  if (!dateString) return Date.now()
  try {
    // 尝试直接解析，如果已经是时间戳或标准格式
    let date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }
    // 尝试添加当前年份来解析 "MM-DD HH:mm" 等格式
    date = new Date(`${new Date().getFullYear()}-${dateString}`)
    if (!isNaN(date.getTime())) {
      return date.getTime()
    }
    // 所有尝试失败后，返回当前时间
    return Date.now()
  } catch (e) {
    return Date.now()
  }
}
