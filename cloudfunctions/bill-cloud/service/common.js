const cloud = require('wx-server-sdk')
const { getTagsByIds } = require('./tag.js')

const db = cloud.database()
const _ = db.command

class BizError extends Error {
  constructor(message) {
    super(message)
    this.isBiz = true
  }
}

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
  const { accountId } = event.query || {}
  const { balanceIncrement, incomeIncrement, expenseIncrement } = event.body || {}
  let { title } = event.body || {}
  if (typeof title === 'string') {
    title = title.trim()
  }
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  const account = dbInstance.collection('account')

  // 构建查询条件
  const where = {
    _id: accountId,
    _openid: OPENID, // 确保用户只能更新自己的账户
  }

  // 1. 查询账户是否存在
  const { data: accounts } = await account.where(where).limit(1).get()

  if (!accounts || accounts.length === 0) {
    throw new Error(`找不到 ID 为 ${accountId} 的账户，或没有权限操作。`)
  }

  // 2. 更新账户
  const updateData = {}
  if (balanceIncrement) updateData.balance = _.inc(balanceIncrement)
  if (incomeIncrement) updateData.totalIncome = _.inc(incomeIncrement)
  if (expenseIncrement) updateData.totalExpense = _.inc(expenseIncrement)
  if (title) updateData.title = title

  if (Object.keys(updateData).length === 0) return accounts[0] // 如果没有要更新的，直接返回当前账户信息

  updateData.updatedAt = Date.now()
  updateData.updatedBy = OPENID

  const result = await account.where(where).update({ data: updateData })

  if (result.stats.updated === 0) {
    throw new Error('更新用户账户失败')
  }
  const { data: newAccounts } = await account.where(where).limit(1).get()
  if (newAccounts && newAccounts.length > 0) {
    const account = newAccounts[0]
    delete account._openid
    account.isOpened = true // 既然能更新，说明是用户自己的私有账本
    return account
  }
  throw new Error('更新用户账户失败')
}

/**
 * 将金额四舍五入到两位小数。
 * @param {number|string} amount - 金额
 * @returns {number} - 处理后的金额
 */
function parseMoney(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) {
    return 0
  }
  // 使用 toFixed(2) 来进行正确的四舍五入并得到一个字符串
  // 然后使用 Number() 将其转换回数字类型。
  // 这是处理货币和需要精确小数位数的场景下的标准做法。
  return Number(num.toFixed(2))
}

/**
 * 为账单列表手动填充 tags 数据
 * @param {Array<object>} bills - 账单对象数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<Array<object>>} - 填充了 tags 的账单对象数组
 */
async function populateTagsForBills(bills, models) {
  if (bills.length > 0) {
    const allTagIds = [...new Set(bills.flatMap((bill) => bill.tags || []).filter(Boolean))]

    if (allTagIds.length > 0) {
      const tags = await getTagsByIds({ query: { ids: allTagIds } }, models)
      const tagsMap = new Map(tags.map((tag) => [tag._id, tag]))

      bills.forEach((bill) => {
        if (Array.isArray(bill.tags)) {
          bill.tags = bill.tags.map((tagId) => tagsMap.get(tagId)).filter(Boolean)
        }
      })
    }
  }
  return bills
}

module.exports = {
  updateAccount,
  parseMoney,
  populateTagsForBills,
  BizError,
}
