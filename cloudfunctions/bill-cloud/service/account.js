const cloud = require('wx-server-sdk')
const { saveBill } = require('./bill.js')

const db = cloud.database()
const _ = db.command

/**
 * 获取当前用户的账户信息。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 * @param {object} [options] - 其他选项
 * @param {boolean} [options.withId=false] - 是否返回 _id 字段
 */
async function getAccount(event, models, { withId = false } = {}) {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return {
      name: 'default',
      balance: 0,
      totalIncome: 0,
      totalExpense: 0,
    }
  }

  const accountRes = await models.account.list({
    select: {
      name: true,
      balance: true,
      totalIncome: true,
      totalExpense: true,
    },
    filter: {
      where: {
        _openid: { $eq: OPENID },
      },
    },
    page: 1,
    pageSize: 1,
  })

  if (accountRes.data && accountRes.data.records.length > 0) {
    const account = accountRes.data.records[0]
    if (!withId) {
      delete account._id
    }
    return account
  }

  // 如果用户还没有账户记录，返回一个默认的初始状态
  return {
    name: 'default',
    balance: 0,
    totalIncome: 0,
    totalExpense: 0,
  }
}

async function reconcileAccount(event, models) {
  const { actualBalance } = event
  const { OPENID } = cloud.getWXContext()

  if (typeof actualBalance !== 'number') {
    throw new Error('缺少有效的 actualBalance 参数')
  }

  // 1. 获取当前系统余额
  const currentAccount = await getAccount(event, models)
  const systemBalance = currentAccount.balance
  const difference = actualBalance - systemBalance

  // 如果没有差额，则无需操作
  if (Math.abs(difference) < 0.01) {
    return currentAccount
  }

  // 2. 确定调账类型和分类
  const isIncome = difference > 0
  const categoryName = isIncome ? '增余额' : '减余额'
  const categoryType = isIncome ? '10' : '20'

  const {
    data: { records: categories },
  } = await models.category.list({
    filter: {
      where: {
        name: { $eq: categoryName },
        type: { $eq: categoryType },
        _openid: { $empty: true }, // 只使用内置的分类
      },
    },
    page: 1,
    pageSize: 1,
  })

  if (!categories || categories.length === 0) {
    throw new Error(`找不到内置分类: ${categoryName}`)
  }
  const category = categories[0]

  // 3. 构建调账账单
  const reconcileBill = {
    amount: difference,
    category: {
      _id: category._id,
      name: category.name,
      type: category.type,
    },
    datetime: Date.now(),
    note: `对账调整`,
  }

  // 4. 创建一个新的 event 对象来调用 saveBill
  const saveBillEvent = {
    ...event, // 继承父 event 的上下文
    body: {
      bill: reconcileBill,
    },
  }

  // 5. 调用 saveBill 来创建账单并自动更新账户余额
  // saveBill 内部处理事务，无需在这里手动开启
  await saveBill(saveBillEvent, models)

  // 6. 返回更新后的账户信息
  // 此时账户信息已经被 saveBill 更新，所以重新获取一次
  return getAccount(event, models)
}

module.exports = {
  getAccount,
  reconcileAccount,
}
