import { ref, watch } from '@vue-mini/core'
import { toRPN, calculateRPN } from './calculator.js'

/**
 * 解析金额字符串，支持简单的四则运算
 * @param {number|string} value - 需要解析的值，可以是数字或包含运算的字符串
 * @returns {number} - 解析并计算后的数字，如果无效则返回 NaN
 */
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
 * @param {object} [chartOptions] - 配置选项
 * @param {number} [chartOptions.maxRetry=3] - 最大重试次数
 * @param {number} [chartOptions.retryTimer=400] - 每次重试的间隔时间 (ms)
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

/**
 * 尝试解析 JSON 字符串，失败则返回原值
 * @param {*} value
 * @returns {*}
 */
export function tryParseJson(value) {
  if (typeof value !== 'string') {
    return value
  }
  try {
    return JSON.parse(value)
  } catch (e) {
    return value
  }
}

/**
 * 将微信小程序异步 API 转换为 Promise 风格
 * @param {Function} func - 需要转换的函数
 * @returns {function(params: object): Promise<any>} - 返回一个 Promise 化的函数
 */
export function promisic(func) {
  return (params = {}) => {
    return new Promise((resolve, reject) => {
      const args = {
        ...params,
        success: resolve,
        fail: reject,
      }
      func(args)
    })
  }
}

/**
 * 将 px 单位转换为 rpx 单位
 * @param {number} pxNumber - px 值
 * @returns {number} - 转换后的 rpx 值
 */
export const px2rpx = function (pxNumber) {
  const { screenWidth } = wx.getWindowInfo()
  return (750 / screenWidth) * pxNumber
}

/**
 * 监听 currentTab 变化的钩子
 * @param {(newTab: string, oldTab: string) => void} callback 回调函数
 * @returns {() => void} 返回一个可以停止监听的函数
 */
export function onTabChange(callback) {
  const stop = watch(getApp().globalData.currentTab, (newTab, oldTab) => {
    callback(newTab, oldTab)
  })
  return stop
}

export function onAccountChange(callback, opts = {}) {
  const stop = watch(getApp().globalData.account, (newAccount, oldAccount) => {
    callback(newAccount, oldAccount)
  })
  if (opts.immediate === true) {
    callback(getApp().globalData.account.value)
  }
  return stop
}

/**
 * 深拷贝一个对象。
 * 注意：此方法对于包含函数、undefined、Symbol 等无法被 JSON 序列化的值无效。
 * @param {T} obj - 需要深拷贝的对象。
 * @returns {T} - 拷贝后的新对象。
 * @template T
 */
export function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj))
}
