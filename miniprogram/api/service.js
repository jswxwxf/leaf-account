/**
 * 微信小程序网络请求服务
 */

// 基础配置
const BASE_URL = 'https://your-api-domain.com/api'
const TIMEOUT = 10000

// 请求去重缓存
const promiseCache = {}

/**
 * 网络请求封装
 * @param {Object} options 请求配置
 * @returns {Promise} 请求结果
 */
export function request(options = {}) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    timeout = TIMEOUT,
    showToast = true,
    ...otherOptions
  } = options

  // 默认请求头
  const defaultHeader = {
    'Content-Type': 'application/json',
    ...header,
  }

  // 获取token（如果需要）
  const token = wx.getStorageSync('token')
  if (token) {
    defaultHeader.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      method: method.toUpperCase(),
      data,
      header: defaultHeader,
      timeout,
      success: (res) => {
        const { statusCode, data: responseData } = res

        // HTTP 状态码检查
        if (statusCode >= 200 && statusCode < 300) {
          // 业务状态码检查
          if (responseData.code !== undefined) {
            switch (responseData.code) {
              case 0:
                // 成功
                resolve(responseData)
                break
              case 401:
                // token过期，清除本地存储并跳转登录
                wx.removeStorageSync('token')
                if (showToast) {
                  wx.showToast({
                    title: '登录已过期，请重新登录',
                    icon: 'none',
                  })
                }
                // 可以在这里添加跳转到登录页的逻辑
                reject(new Error('登录已过期'))
                break
              default:
                // 其他业务错误
                if (showToast) {
                  wx.showToast({
                    title: responseData.message || '请求失败',
                    icon: 'none',
                  })
                }
                reject(new Error(responseData.message || '请求失败'))
            }
          } else {
            // 没有业务状态码，直接返回数据
            resolve(responseData)
          }
        } else {
          // HTTP 状态码错误
          const errorMessage = getHttpErrorMessage(statusCode)
          if (showToast) {
            wx.showToast({
              title: errorMessage,
              icon: 'none',
            })
          }
          reject(new Error(errorMessage))
        }
      },
      fail: (error) => {
        console.error('网络请求失败:', error)
        if (showToast) {
          wx.showToast({
            title: '网络请求失败',
            icon: 'none',
          })
        }
        reject(error)
      },
      ...otherOptions,
    })
  })
}

/**
 * 网络请求去重，只针对GET请求
 * @param {Object} config 请求配置
 * @param {Function} fnGeneratePromise 生成Promise的函数
 * @param {Object} options 选项配置
 * @returns {Promise} 请求结果
 */
async function dedupRequest(config, fnGeneratePromise, options = {}) {
  const opts = {
    dedupExpire: 0,
    ...options,
  }

  // 只针对get
  if (config.method !== 'get') {
    return fnGeneratePromise()
  }

  const key = JSON.stringify(config)
  let [servicePromise, timer] = promiseCache[key] || []
  if (!servicePromise) {
    servicePromise = fnGeneratePromise()
    promiseCache[key] = [servicePromise, timer]
  }

  try {
    return await servicePromise
  } finally {
    if (!timer && opts.dedupExpire !== -1) {
      timer = setTimeout(() => delete promiseCache[key], opts.dedupExpire)
      promiseCache[key][1] = timer
    }
  }
}

/**
 * GET 请求
 * @param {string} url 请求地址
 * @param {Object} params 请求参数
 * @param {Object} options 其他配置
 * @returns {Promise} 请求结果
 */
export function get(url, params = {}, options = {}) {
  const config = {
    url,
    method: 'get',
    data: params,
    ...options,
  }

  return dedupRequest(config, () => request(config), options)
}

/**
 * POST 请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他配置
 * @returns {Promise} 请求结果
 */
export function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options,
  })
}

/**
 * PUT 请求
 * @param {string} url 请求地址
 * @param {Object} data 请求数据
 * @param {Object} options 其他配置
 * @returns {Promise} 请求结果
 */
export function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options,
  })
}

/**
 * DELETE 请求
 * @param {string} url 请求地址
 * @param {Object} params 请求参数
 * @param {Object} options 其他配置
 * @returns {Promise} 请求结果
 */
export function del(url, params = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data: params,
    ...options,
  })
}

/**
 * 文件上传
 * @param {string} url 上传地址
 * @param {string} filePath 文件路径
 * @param {Object} formData 额外的表单数据
 * @param {Object} options 其他配置
 * @returns {Promise} 上传结果
 */
export function uploadFile(url, filePath, formData = {}, options = {}) {
  const { showToast = true, ...uploadOptions } = options
  const token = wx.getStorageSync('token')
  const header = {
    ...uploadOptions.header,
  }

  if (token) {
    header.Authorization = `Bearer ${token}`
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      filePath,
      name: 'file',
      formData,
      header,
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0) {
            resolve(data)
          } else {
            if (showToast) {
              wx.showToast({
                title: data.message || '上传失败',
                icon: 'none',
              })
            }
            reject(new Error(data.message || '上传失败'))
          }
        } catch (error) {
          reject(new Error('响应数据解析失败'))
        }
      },
      fail: (error) => {
        console.error('文件上传失败:', error)
        if (showToast) {
          wx.showToast({
            title: '文件上传失败',
            icon: 'none',
          })
        }
        reject(error)
      },
      ...uploadOptions,
    })
  })
}

/**
 * 获取HTTP错误信息
 * @param {number} statusCode HTTP状态码
 * @returns {string} 错误信息
 */
function getHttpErrorMessage(statusCode) {
  const errorMessages = {
    400: '请求错误',
    401: '未授权，请登录',
    403: '拒绝访问',
    404: '请求地址出错',
    408: '请求超时',
    500: '服务器内部错误',
    501: '服务未实现',
    502: '网关错误',
    503: '服务不可用',
    504: '网关超时',
    505: 'HTTP版本不受支持',
  }

  return errorMessages[statusCode] || `连接错误${statusCode}`
}
