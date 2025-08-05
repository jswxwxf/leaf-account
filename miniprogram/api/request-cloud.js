/**
 * 微信小程序云函数请求服务
 */

import { dedupRequest } from './request.js'

/**
 * 云函数请求封装
 * @param {Object} options 请求配置
 * @returns {Promise} 请求结果
 */
async function request(options = {}) {
  const {
    name,
    data = {},
    showError = true, // 默认显示错误提示
    ...otherOptions
  } = options

  if (!name) {
    throw new Error('调用云函数需要提供 name')
  }

  try {
    const res = await wx.cloud.callFunction({
      name,
      data,
      ...otherOptions,
    })

    // 检查云函数返回结果
    if (res.result && res.result.code !== undefined && res.result.code !== 0 && res.result.code !== 200) {
      const bizError = new Error(res.result.message || '云函数业务请求失败')
      bizError.code = res.result.code
      throw bizError
    }

    // 如果返回的是标准 TcbRouter 格式，提取 body
    if (res.result && res.result.body) {
      return res.result.body
    }

    return res.result
  } catch (error) {
    // 统一错误处理
    console.error('Cloud Function Request Failed:', {
      name,
      data,
      error,
    })

    if (showError) {
      const title = error.message || '网络请求失败'
      wx.showToast({ title, icon: 'none' })
    }

    // 将原始错误向上抛出，以便上层可以进行特定处理
    throw error
  }
}


/**
 * 调用云函数进行读操作（带去重）
 * @param {string} name 云函数名称
 * @param {Object} data 业务数据
 * @param {Object} options 其他配置
 * @returns {Promise} 请求结果
 */
export function get(name, data = {}, options = {}) {
  const config = { name, data, method: 'get' }
  return dedupRequest(config, () => request({ ...config, ...options }), options)
}

/**
 * 调用云函数进行写操作
 * @param {string} name 云函数名称
 * @param {Object} data 业务数据
 * @param {Object} options 其他配置
 * @returns {Promise} 请求结果
 */
export function post(name, data = {}, options = {}) {
  return request({
    name,
    data,
    method: 'post',
    ...options,
  })
}
