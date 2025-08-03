const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')
const { init } = require('@cloudbase/wx-cloud-client-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

// 初始化 client 和 models
const client = init(cloud)
const models = client.models
const db = cloud.database()

const { saveBill, getBillsByDate, deleteBill } = require('./service/bill.js')
const { getCategories, addCategory } = require('./service/category.js')
const { getTags, addTags } = require('./service/tag.js')

exports.main = (event, context) => {
  const app = new TcbRouter({ event })

  // 账单相关的路由
  app.router('/upsert/bill', async (ctx) => {
    ctx.body = await saveBill(event, models)
  })

  app.router('/get/bills/bydate', async (ctx) => {
    ctx.body = await getBillsByDate(event, models)
  })

  app.router('/delete/bill', async (ctx) => {
    ctx.body = await deleteBill(event, models)
  })

  app.router('/get/categories', async (ctx) => {
    ctx.body = await getCategories(models)
  })

  app.router('/get/tags', async (ctx) => {
    ctx.body = await getTags(models)
  })

  app.router('/post/category', async (ctx) => {
    ctx.body = await addCategory(event.category, models)
  })

  app.router('/post/tags', async (ctx) => {
    ctx.body = await addTags(event.tags, models)
  })

  return app.serve()
}
