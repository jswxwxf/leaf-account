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
  // _openid 会由 wx-server-sdk 自动注入，无需手动获取
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!OPENID) {
    throw new Error('必须提供 OPENID 以更新账户')
  }

  const account = dbInstance.collection('account')

  // 1. 查询账户是否存在
  // 注意：云函数环境下的数据库操作会自动带上调用者的 openid，
  // 但为了逻辑清晰和在事务中正确操作，这里明确使用 where 子句。
  const { data: accounts } = await account.where({ _openid: OPENID }).limit(1).get()

  let result
  if (accounts && accounts.length > 0) {
    // 2. 如果存在，则更新
    const updateData = {}
    if (balanceIncrement) updateData.balance = _.inc(balanceIncrement)
    if (incomeIncrement) updateData.totalIncome = _.inc(incomeIncrement)
    if (expenseIncrement) updateData.totalExpense = _.inc(expenseIncrement)

    if (Object.keys(updateData).length === 0) return // 如果没有要更新的，直接返回

    result = await account.where({ _openid: OPENID }).update({ data: updateData })
    if (result.stats.updated === 0) {
      // 理论上不会发生，因为我们已经查询过
      throw new Error('更新用户账户失败')
    }
  } else {
    // 3. 如果不存在，则创建
    // 在云函数中使用 db.add() 时，必须手动添补 _openid
    result = await account.add({
      data: {
        _openid: OPENID,
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

module.exports = {
  updateAccount,
  getAccount,
}
