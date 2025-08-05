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
const { getAccount } = require('./service/account.js')
const { getCategories, addCategory } = require('./service/category.js')
const { getTags, addTags } = require('./service/tag.js')

exports.main = (event, context) => {
  const app = new TcbRouter({ event })

  /**
   * @desc 新增或更新账单
   */
  app.router('/upsert/bill', async (ctx) => {
    try {
      const data = await saveBill(event, models)
      const account = await getAccount(event, models)
      ctx.body = { code: 200, success: true, message: '保存成功', data, account }
    } catch (e) {
      console.error('/upsert/bill error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 获取账单列表
   * @param {object} query - 查询参数
   * @param {string} [query.month] - 月份，格式 'YYYY-MM'
   * @param {string} [query.type] - 账单类型，'10' 为收入，'20' 为支出
   * @param {string} [query.startDate] - 开始日期，格式 'YYYY-MM-DD'
   * @returns {object} data - 账单列表
   * @returns {string|null} nextStartDate - 下一次请求的开始日期
   * @returns {object} account - 当前账户信息
   */
  app.router('/get/bills', async (ctx) => {
    try {
      const result = await getBills(event, models)
      const account = await getAccount(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', ...result, account }
    } catch (e) {
      console.error('/get/bills error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 获取账单汇总
   * @param {object} query - 查询参数
   * @param {string} [query.month] - 月份，格式 'YYYY-MM'
   * @param {string} [query.type] - 账单类型，'10' 为收入，'20' 为支出
   * @returns {object} data - 汇总数据 { totalIncome, totalExpense }
   * @returns {object} account - 当前账户信息
   */
  app.router('/get/bills/summary', async (ctx) => {
    try {
      const result = await getBillsSummary(event, models)
      const account = await getAccount(event, models)
      ctx.body = { code: 200, success: true, message: '获取成功', data: result, account }
    } catch (e) {
      console.error('/get/bills/summary error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 批量保存账单
   * @param {object} body - 请求体
   * @param {object[]} body.bills - 账单对象数组
   * @returns {object[]} data - 成功保存的账单数组
   * @returns {object} account - 当前账户信息
   */
  app.router('/batch/bills', async (ctx) => {
    try {
      const data = await saveBills(event, models)
      const account = await getAccount(event, models)
      ctx.body = { code: 200, success: true, message: '批量保存成功', data, account }
    } catch (e) {
      console.error('/batch/bills error:', e)
      ctx.body = { code: 500, success: false, message: '请求失败，请稍后重试' }
    }
  })

  /**
   * @desc 删除账单
   * @param {string} id - 要删除的账单ID
   * @returns {object} account - 当前账户信息
   */
  app.router('/delete/bill', async (ctx) => {
    try {
      const isSuccess = await deleteBill(event, models)
      if (isSuccess) {
        const account = await getAccount(event, models)
        ctx.body = { code: 200, success: true, message: '删除成功', account }
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
