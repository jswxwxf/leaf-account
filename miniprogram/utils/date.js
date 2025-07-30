import { DateTime } from 'luxon'

/**
 * 获取日期是星期几 (使用 Luxon)
 * @param {string} dateString - 日期字符串 (YYYY-MM-DD)
 * @returns {string}
 */
export function getDayOfWeek(dateString) {
  const date = DateTime.fromISO(dateString)
  const today = DateTime.now()

  if (date.hasSame(today, 'day')) {
    return '今天'
  }
  if (date.hasSame(today.minus({ days: 1 }), 'day')) {
    return '昨天'
  }
  // Luxon's toFormat('cccc') will produce '星期一', '星期二', etc. with the right locale.
  return date.setLocale('zh-cn').toFormat('cccc')
}

/**
 * 格式化日期
 * @param {Date | number} date - 日期对象或时间戳
 * @param {string} fmt - 格式字符串，例如 'YYYY-MM-DD hh:mm:ss'
 * @returns {string}
 */
export function formatDate(date, fmt) {
  if (!date) return ''
  return DateTime.fromJSDate(new Date(date)).toFormat(fmt)
}

// 导出 DateTime 实例，方便在其他地方统一使用
export { DateTime }
