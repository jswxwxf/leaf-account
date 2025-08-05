const cloud = require('wx-server-sdk')

const db = cloud.database()
const _ = db.command

/**
 * 原子化地更新用户的账户汇总信息。
 * 如果账户不存在，则会自动创建。
 * @param {object} event - 包含增量信息的对象
 * @param {number} event.balanceIncrement - 余额的变动量
 * @param {number} event.incomeIncrement - 总收入的变动量
 * @param {number} event.expenseIncrement - 总支出的变动量
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 数据库或事务实例，如果未提供，则使用默认的 db 实例
 */
async function updateAccount(event, models, dbOrTransaction) {
  const { balanceIncrement, incomeIncrement, expenseIncrement } = event
  const { OPENID: userId } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!userId) {
    throw new Error('必须提供 userId 以更新账户')
  }

  const account = dbInstance.collection('account')

  // 1. 查询账户是否存在
  const { data: accounts } = await account.where({ userId }).limit(1).get()

  let result
  if (accounts && accounts.length > 0) {
    // 2. 如果存在，则更新
    const updateData = {}
    if (balanceIncrement) updateData.balance = _.inc(balanceIncrement)
    if (incomeIncrement) updateData.totalIncome = _.inc(incomeIncrement)
    if (expenseIncrement) updateData.totalExpense = _.inc(expenseIncrement)

    if (Object.keys(updateData).length === 0) return // 如果没有要更新的，直接返回

    result = await account.doc(accounts[0]._id).update({ data: updateData })
    if (result.stats.updated === 0) {
      throw new Error('更新用户账户失败')
    }
  } else {
    // 3. 如果不存在，则创建
    result = await account.add({
      data: {
        userId: userId,
        name: 'default',
        balance: balanceIncrement || 0,
        totalIncome: incomeIncrement || 0,
        totalExpense: expenseIncrement || 0,
      },
    })
    if (!result._id) {
      throw new Error('创建用户账户失败')
    }
  }
}

/**
 * 获取当前用户的账户信息。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 * @param {object} [options] - 其他选项
 * @param {boolean} [options.withId=false] - 是否返回 _id 字段
 */
async function getAccount(event, models, { withId = false } = {}) {
  const { OPENID } = cloud.getWXContext()

  const accountRes = await models.account.list({
    select: {
      name: true,
      balance: true,
      totalIncome: true,
      totalExpense: true,
    },
    filter: {
      where: {
        userId: { $eq: OPENID },
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
    // 默认对象不包含 userId
    name: 'default',
    balance: 0,
    totalIncome: 0,
    totalExpense: 0,
  }
}

module.exports = {
  updateAccount,
  getAccount,
}
