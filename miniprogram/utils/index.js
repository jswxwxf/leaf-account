import { ref } from '@vue-mini/core'
import { toRPN, calculateRPN } from './calculator.js'


export function parseMoney(value) {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return NaN
  }

  const cleanedValue = value.replace(/,/g, '').replace(/\s/g, '')

  // 检查是否包含运算符或括号，如果没有，则直接解析
  if (!/[+\-*/()×]/.test(cleanedValue)) {
    return parseFloat(cleanedValue)
  }

  try {
    const rpn = toRPN(cleanedValue)
    if (rpn.length === 0) return NaN
    const result = calculateRPN(rpn)
    return typeof result === 'number' && isFinite(result) ? result : NaN
  } catch (e) {
    return NaN
  }
}

/**
 * 格式化金额，添加千分位逗号
 * @param {number|string} value - 需要格式化的值
 * @param {number} [digits=2] - 保留的小数位数
 * @returns {string} - 格式化后的金额字符串
 */
export function formatMoney(value, digits = 2) {
  const num = parseMoney(value)
  if (isNaN(num)) return '' // 如果解析失败，返回空字符串

  // 检查是否为负数
  const isNegative = num < 0
  const absoluteNum = Math.abs(num)

  // 四舍五入到指定小数位数
  const fixedNum = absoluteNum.toFixed(digits)

  // 分割整数和小数部分
  const parts = fixedNum.split('.')
  let integerPart = parts[0]
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : ''

  // 使用正则表达式每三位添加一个逗号
  const rgx = /(\d+)(\d{3})/
  while (rgx.test(integerPart)) {
    integerPart = integerPart.replace(rgx, '$1,$2')
  }

  // 组合最终结果，并处理负数情况
  return (isNegative ? '-' : '') + integerPart + decimalPart
}

/**
 * 等待直到条件满足或超时
 * @param {() => boolean} conditionFunction - 条件检查函数，返回 true 时停止
 * @param {object} [options] - 配置选项
 * @param {number} [options.maxRetry=3] - 最大重试次数
 * @param {number} [options.retryTimer=400] - 每次重试的间隔时间 (ms)
 * @returns {Promise<void>} - 当条件满足时 resolve
 */
export function until(conditionFunction, options = {}) {
  const opts = {
    maxRetry: 3,
    retryTimer: 400,
    ...options,
  }
  let retryCount = 0
  const poll = (resolve) => {
    if (conditionFunction()) {
      resolve()
      return
    }
    retryCount++
    if (retryCount > opts.maxRetry) {
      return
    }
    setTimeout((_) => poll(resolve), opts.retryTimer)
  }

  return new Promise(poll)
}

/**
 * 判断当前页面是否是指定路由
 * @param {string} route - 页面路由
 * @returns {boolean}
 */
export function isCurrentPage(route) {
  const pages = getCurrentPages()
  if (pages.length === 0) {
    return false
  }
  return pages[pages.length - 1].route === route
}
