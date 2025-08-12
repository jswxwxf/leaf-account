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
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!OPENID) {
    throw new Error('必须提供 OPENID 以更新账户')
  }

  const account = dbInstance.collection('account')

  // 1. 查询账户是否存在
  const { data: accounts } = await account.where({ _openid: OPENID }).limit(1).get()

  let result
  if (accounts && accounts.length > 0) {
    // 2. 如果存在，则更新
    const updateData = {}
    if (balanceIncrement) updateData.balance = _.inc(balanceIncrement)
    if (incomeIncrement) updateData.totalIncome = _.inc(incomeIncrement)
    if (expenseIncrement) updateData.totalExpense = _.inc(expenseIncrement)

    if (Object.keys(updateData).length === 0) return // 如果没有要更新的，直接返回

    updateData.updatedAt = Date.now()
    updateData.updatedBy = OPENID

    result = await account.where({ _openid: OPENID }).update({ data: updateData })
    if (result.stats.updated === 0) {
      throw new Error('更新用户账户失败')
    }
  } else {
    // 3. 如果不存在，则创建
    result = await account.add({
      data: {
        _openid: OPENID,
        name: 'default',
        balance: balanceIncrement || 0,
        totalIncome: incomeIncrement || 0,
        totalExpense: expenseIncrement || 0,
        createdAt: Date.now(),
        createdBy: OPENID,
        updatedAt: Date.now(),
        updatedBy: OPENID,
      },
    })
    if (!result._id) {
      throw new Error('创建用户账户失败')
    }
  }
}

class BizError extends Error {
  constructor(message) {
    super(message)
    this.isBiz = true
  }
}

module.exports = {
  updateAccount,
  BizError,
}
