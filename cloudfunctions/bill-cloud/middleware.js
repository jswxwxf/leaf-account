// 自定义业务逻辑错误
class BizError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BizError'
    this.isBiz = true // 自定义标记
  }
}

const useMiddlewares = (app, event, models) => {
  // 统一的错误处理中间件
  app.use(async (ctx, next) => {
    try {
      await next()
    } catch (e) {
      console.error('Unhandled error in middleware:', e)
      // 默认的最终错误处理
      ctx.body = {
        code: 500,
        success: false,
        message: '服务器内部错误，请稍后重试',
      }
    }
  })

  // 示例：注入数据库模型到 ctx
  app.use(async (ctx, next) => {
    ctx.models = models
    await next()
  })

  // 示例：记录请求日志
  app.use(async (ctx, next) => {
    console.log(`Request to path: ${event.$url}`)
    await next()
  })
}

module.exports = {
  useMiddlewares,
  BizError,
}
