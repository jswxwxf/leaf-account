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

const {
  saveBill,
  saveBills,
  getBills,
  deleteBill,
  getBillsByIds,
  getBillsSummary,
} = require('./service/bill.js')
const { getCategories, addCategory } = require('./service/category.js')
const { getTags, addTags } = require('./service/tag.js')

exports.main = (event, context) => {
  const app = new TcbRouter({ event })

  // 账单相关的路由
  app.router('/upsert/bill', async (ctx) => {
    try {
      const data = await saveBill(event, models)
      ctx.body = { code: 200, success: true, message: '保存成功', data }
    } catch (e) {
      console.error('/upsert/bill error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/get/bills', async (ctx) => {
    try {
      const result = await getBills(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', ...result }
    } catch (e) {
      console.error('/get/bills error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/get/bills/summary', async (ctx) => {
    try {
      const result = await getBillsSummary(event)
      ctx.body = { code: 200, success: true, message: '获取成功', data: result }
    } catch (e) {
      console.error('/get/bills/summary error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/batch/bills', async (ctx) => {
    try {
      const data = await saveBills(event, models)
      ctx.body = { code: 200, success: true, message: '批量保存成功', data }
    } catch (e) {
      console.error('/batch/bills error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/delete/bill', async (ctx) => {
    try {
      const isSuccess = await deleteBill(event, models)
      if (isSuccess) {
        ctx.body = { code: 200, success: true, message: '删除成功' }
      } else {
        ctx.body = { code: 404, success: false, message: '未找到要删除的记录' }
      }
    } catch (e) {
      console.error('/delete/bill error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/get/bills/byids', async (ctx) => {
    try {
      const bills = await getBillsByIds(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', data: bills }
    } catch (e) {
      console.error('/get/bills/byids error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/get/categories', async (ctx) => {
    try {
      const data = await getCategories(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', data }
    } catch (e) {
      console.error('/get/categories error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/get/tags', async (ctx) => {
    try {
      const data = await getTags(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', data }
    } catch (e) {
      console.error('/get/tags error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/post/category', async (ctx) => {
    try {
      // addCategory 的函数签名已统一为 (event, models)
      const data = await addCategory(event, models)
      ctx.body = { code: 200, success: true, message: '添加成功', data }
    } catch (e) {
      console.error('/post/category error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  app.router('/post/tags', async (ctx) => {
    try {
      // addTags 的函数签名已统一为 (event, models)
      const data = await addTags(event, models)
      ctx.body = { code: 200, success: true, message: '批量添加成功', data }
    } catch (e) {
      console.error('/post/tags error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  return app.serve()
}
