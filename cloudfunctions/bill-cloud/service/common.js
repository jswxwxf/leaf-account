// 自定义业务逻辑错误
class BizError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BizError'
    this.isBiz = true // 自定义标记
  }
}

module.exports = {
  BizError,
}
