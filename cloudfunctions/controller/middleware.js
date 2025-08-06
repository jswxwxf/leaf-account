const cloud = require('wx-server-sdk')
const { getAccount } = require('./service/account.js')
const { getBillsSummary } = require('./service/bill.js')

// --- 中间件应用的路由列表 ---
const REQUIRE_LOGIN_ROUTES = [
  '/upsert/bill',
  '/batch/bills',
  '/delete/bill',
  '/post/category',
  '/post/tags',
]
const WITH_ACCOUNT_ROUTES = ['/upsert/bill', '/get/bills', '/batch/bills', '/delete/bill']
const WITH_SUMMARY_ROUTES = ['/upsert/bill', '/get/bills', '/batch/bills', '/delete/bill']

/**
 * 权限校验中间件
 * @param {object} event - 云函数 event 对象
 */
const requireLogin = (event) => async (ctx, next) => {
  if (REQUIRE_LOGIN_ROUTES.includes(event.$url)) {
    const { OPENID } = cloud.getWXContext()
    if (!OPENID) {
      ctx.body = { code: 401, success: false, message: '用户未登录' }
      return // 中断执行
    }
  }
  await next()
}

/**
 * 附加账户信息中间件
 * @param {object} models - CloudBase 数据模型
 * @param {object} event - 云函数 event 对象
 */
const withAccount = (models, event) => async (ctx, next) => {
  await next() // 先执行后续路由
  if (WITH_ACCOUNT_ROUTES.includes(event.$url) && ctx.body && ctx.body.success) {
    const account = await getAccount(event, models)
    ctx.body.account = account
  }
}

/**
 * 附加月度账单汇总中间件
 * @param {object} models - CloudBase 数据模型
 * @param {object} event - 云函数 event 对象
 */
const withSummary = (models, event) => async (ctx, next) => {
  await next() // 先执行后续路由
  const month = event.query?.month
  if (WITH_SUMMARY_ROUTES.includes(event.$url) && ctx.body && ctx.body.success && month) {
    const summary = await getBillsSummary({ ...event, query: { ...event.query, month } }, models)
    ctx.body.summary = {
      totalIncome: summary.totalIncome || 0,
      totalExpense: Math.abs(summary.totalExpense || 0),
    }
  }
}

/**
 * 注册所有应用中间件
 * @param {object} app - TcbRouter 实例
 * @param {object} event - 云函数 event 对象
 * @param {object} models - CloudBase 数据模型
 */
function registerMiddlewares(app, event, models) {
  app.use(requireLogin(event))
  app.use(withAccount(models, event))
  app.use(withSummary(models, event))
}

module.exports = {
  registerMiddlewares,
}
