const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const { saveBill } = require('./service/bill.js')
const { getCategories, addCategory } = require('./service/category.js')
const { getTags, addTags } = require('./service/tag.js')

exports.main = (event, context) => {
  const app = new TcbRouter({ event })

  // 账单相关的路由
  app.router('/upsert/bill', async (ctx) => {
    ctx.body = await saveBill(event)
  })

  app.router('/get/categories', async (ctx) => {
    ctx.body = await getCategories()
  })

  app.router('/get/tags', async (ctx) => {
    ctx.body = await getTags()
  })

  app.router('/post/category', async (ctx) => {
    ctx.body = await addCategory(event.category)
  })

  app.router('/post/tags', async (ctx) => {
    ctx.body = await addTags(event.tags)
  })

  return app.serve()
}
