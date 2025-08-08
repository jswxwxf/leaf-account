const cloud = require('wx-server-sdk')
const { init } = require('@cloudbase/wx-cloud-client-sdk')
const TcbRouter = require('tcb-router')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

// 初始化 client 和 models
const client = init(cloud)
const models = client.models
const db = cloud.database()

const { useMiddlewares } = require('./middleware.js')

const {
  saveBill,
  saveBills,
  getBills,
  deleteBill,
  getBillsByIds,
  getBillsSummary,
} = require('./service/bill.js')
const { getAccount } = require('./service/account.js')
const { getCategories, addCategory } = require('./service/category.js')
const { getTags, addTags } = require('./service/tag.js')

exports.main = (event, context) => {
  const app = new TcbRouter({ event })

  // 注册所有中间件
  useMiddlewares(app, event, models)

  /**
   * @desc 新增或更新账单
   */
  app.router('/upsert/bill', async (ctx) => {
    try {
      const data = await saveBill(event, models)
      ctx.body = { code: 200, success: true, message: '保存成功', data }
    } catch (e) {
      console.error('/upsert/bill error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 获取账单列表
   */
  app.router('/get/bills', async (ctx) => {
    try {
      const result = await getBills(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', ...result }
    } catch (e) {
      console.error('/get/bills error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 批量保存账单
   */
  app.router('/batch/bills', async (ctx) => {
    try {
      const data = await saveBills(event, models)
      ctx.body = { code: 200, success: true, message: '批量保存成功', data }
    } catch (e) {
      console.error('/batch/bills error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 删除账单
   */
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

  /**
   * @desc 获取账本信息
   * @returns {object} data - 账本信息
   */
  app.router('/get/account', async (ctx) => {
    try {
      const data = await getAccount(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', data }
    } catch (e) {
      console.error('/get/account error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 获取分类列表
   * @param {object} query - 查询参数
   * @param {string} [query.type] - 分类类型，'10' 为收入，'20' 为支出
   * @returns {object[]} data - 分类对象数组
   */
  app.router('/get/categories', async (ctx) => {
    try {
      const data = await getCategories(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', data }
    } catch (e) {
      console.error('/get/categories error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 获取标签列表
   * @returns {object[]} data - 标签对象数组
   */
  app.router('/get/tags', async (ctx) => {
    try {
      const data = await getTags(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', data }
    } catch (e) {
      console.error('/get/tags error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 新增分类
   * @param {object} body - 请求体
   * @param {object} body.category - 分类对象
   * @returns {object} data - 新增的分类对象
   */
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

  /**
   * @desc 批量新增标签
   * @param {object} body - 请求体
   * @param {object[]} body.tags - 标签对象数组
   * @returns {object[]} data - 成功保存的标签数组
   */
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
