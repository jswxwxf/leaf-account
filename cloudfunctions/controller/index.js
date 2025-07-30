const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')
const { saveBill } = require('./service/bill.js')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = (event, context) => {
  const app = new TcbRouter({ event })

  // 账单相关的路由
  app.router('/upsert/bill', async (ctx) => {
    ctx.body = await saveBill(event)
  })

  // 未来可以扩展其他模型的路由
  // app.router('category.get', async (ctx) => { ... })
  // app.router('tag.list', async (ctx) => { ... })

  return app.serve()
}
