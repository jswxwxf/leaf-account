import dayjs from '@/vendor/dayjs/esm/index.js'
import zhCn from '@/vendor/dayjs/esm/locale/zh-cn.js'
import isToday from '@/vendor/dayjs/plugin/isToday.js'
import isYesterday from '@/vendor/dayjs/plugin/isYesterday.js'
import customParseFormat from '@/vendor/dayjs/plugin/customParseFormat.js'

dayjs.locale(zhCn, null, true) // 使用对象显式加载语言包
dayjs.locale('zh-cn') // 全局使用简体中文
dayjs.extend(isToday)
dayjs.extend(isYesterday)
dayjs.extend(customParseFormat)

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
export function formatDate(date, fmt = 'YYYY-MM-DD HH:mm:ss') {
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

  // 定义一个包含所有可能格式的数组。
  // dayjs 会按顺序尝试解析，因此将最具体的格式放在前面。
  // 对于不含年份的格式，dayjs 会自动使用当前年份。
  const formats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD',
    'YYYY/MM/DD HH:mm:ss',
    'YYYY/MM/DD HH:mm',
    'YYYY/MM/DD',
    'M月D日 HH:mm', // 直接处理 "8月6日 09:47"
    'M月D日', // 直接处理 "8月6日"
    'M-D HH:mm',
    'M-D',
    'HH:mm',
  ]

  // 第三个参数 'zh-cn' 确保本地化正确，第四个参数 `true` 启用严格模式解析。
  const d = dayjs(dateString, formats, 'zh-cn', true)

  if (d.isValid()) {
    return d.valueOf()
  }

  // 如果所有格式都解析失败，则返回当前时间作为最终的保障。
  return Date.now()
}

/**
 * 获取指定月份的开始和结束时间戳
 * @param {string} monthString - 月份字符串 (YYYY-MM)
 * @returns {{startTime: number, endTime: number}}
 */
export function getMonthRange(monthString) {
  const date = dayjs(monthString, 'YYYY-MM')
  const startTime = date.startOf('month').valueOf()
  const endTime = date.endOf('month').valueOf()
  return { startTime, endTime }
}
