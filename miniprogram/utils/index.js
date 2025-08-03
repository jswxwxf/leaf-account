import { ref } from '@vue-mini/core'

export const tagsPopup = ref(null)

export function showTagsPopup(tags) {
  if (!tagsPopup.value) {
    return Promise.reject(new Error('Tags popup not initialized'))
  }
  return tagsPopup.value.show(tags)
}

export const categoryPopup = ref(null)

export function showCategoryPopup() {
  if (!categoryPopup.value) {
    return Promise.reject(new Error('Category popup not initialized'))
  }
  return categoryPopup.value.show()
}

export const calendarPopup = ref(null)

export function showCalendar(currentDate) {
  if (!calendarPopup.value) {
    return Promise.reject(new Error('Calendar popup not initialized'))
  }
  return calendarPopup.value.show(currentDate)
}

export const theToast = ref(null)

export function showToast(message) {
  if (!theToast.value) {
    return Promise.reject(new Error('Toast not initialized'))
  }
  return theToast.value.showToast(message)
}

/**
 * 将可能带逗号的金额字符串解析为数字
 * @param {string | number} value - 金额
 * @returns {number}
 */
export function parseMoney(value) {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value !== 'string') {
    return NaN
  }
  // parseFloat will correctly return NaN for empty or invalid strings
  return parseFloat(value.replace(/,/g, ''))
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

  const options = {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: true,
  }

  // toLocaleString 自带千分位和负号处理
  return num.toLocaleString('en-US', options)
}
