const cloud = require('wx-server-sdk')
const { getTagsByIds } = require('./tag.js')

const db = cloud.database()
const _ = db.command

/**
 * 自定义业务逻辑错误类。
 * 用于在事务中区分业务错误和系统错误，以便正确处理回滚。
 */
class BizError extends Error {
  constructor(message) {
    super(message)
    this.isBiz = true
  }
}

/**
 * 将任意值解析为标准的货币格式（保留两位小数的数字）。
 * @param {*} amount - 需要解析的金额
 * @returns {number} - 格式化后的金额
 */
function parseMoney(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) {
    return 0
  }
  return Number(num.toFixed(2))
}

/**
 * 尝试将字符串解析为 JSON 对象。
 * 如果解析失败，则返回原始字符串。
 * @param {string} str - 需要解析的字符串
 * @returns {object|string} - 解析后的对象或原始字符串
 */
function tryParseJSON(str) {
  if (typeof str !== 'string') {
    return str
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    return str
  }
}

/**
 * 尝试将 JavaScript 值转换为 JSON 字符串。
 * @param {*} value - 需要转换的值
 * @returns {string} - JSON 字符串或原始值的字符串表示
 */
function tryStringifyJSON(value) {
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch (e) {
      return String(value)
    }
  }
  return value
}

module.exports = {
  BizError,
  parseMoney,
  tryParseJSON,
  tryStringifyJSON,
}
