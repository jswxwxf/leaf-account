const cloud = require('wx-server-sdk')
const { getAccount } = require('./service/account.js')
const { getBillsSummary } = require('./service/bill.js')

const { BizError } = require('./service/common.js')

// --- 中间件应用的路由列表 ---
const REQUIRE_LOGIN_ROUTES = [
  '/upsert/bill',
  '/post/transfer',
  '/batch/bills',
  '/delete/bill',
  '/post/category',
  '/post/tags',
  '/get/account',
  '/get/accounts',
  '/put/account/reconcile',
  '/put/account',
]
const REQUIRE_ACCOUNT_ID_ROUTES = [
  '/upsert/bill',
  '/post/transfer',
  '/batch/bills',
  '/delete/bill',
  '/get/bills',
  '/get/bills/all',
  '/get/bills/summary',
  '/put/account/reconcile',
  '/put/account',
]
const WITH_ACCOUNT_ROUTES = ['/upsert/bill', '/get/bills', '/get/bills/all', '/batch/bills', '/delete/bill']
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
 * 校验 accountId 中间件
 * @param {object} event - 云函数 event 对象
 */
const requireAccountId = (event) => async (ctx, next) => {
  if (REQUIRE_ACCOUNT_ID_ROUTES.includes(event.$url)) {
    if (!event.query?.accountId) {
      ctx.body = { code: 400, success: false, message: '请求中缺少 accountId 参数' }
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
  const { startTime, endTime, accountId } = event.query || {}
  if (
    WITH_SUMMARY_ROUTES.includes(event.$url) &&
    ctx.body &&
    ctx.body.success &&
    startTime &&
    endTime &&
    accountId
  ) {
    const summary = await getBillsSummary({ ...event, query: { ...event.query, accountId } }, models)
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
function useMiddlewares(app, event, models) {
  app.use(requireLogin(event))
  app.use(requireAccountId(event))
  app.use(withAccount(models, event))
  app.use(withSummary(models, event))
}

module.exports = {
  useMiddlewares,
}
