const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command
const $ = _.aggregate

/**
 *  为现有用户迁移账户数据。
 *  遍历所有账单，为每个用户计算总收入、总支出和余额，并写入 account 集合。
 */
exports.main = async (event, context) => {
  console.log('开始执行账户数据迁移脚本...')

  try {
    // 1. 获取所有不重复的用户ID
    const userResult = await db.collection('bill').aggregate().group({
      _id: '$_openid',
    }).end()

    if (!userResult.list || userResult.list.length === 0) {
      console.log('没有找到任何用户，无需迁移。')
      return { success: true, message: '没有找到任何用户，无需迁移。' }
    }

    const userIds = userResult.list.map(item => item._id)
    console.log(`找到 ${userIds.length} 个独立用户需要迁移。`)

    let successCount = 0
    let failCount = 0

    // 2. 为每个用户计算并写入账户信息
    for (const userId of userIds) {
      try {
        console.log(`正在处理用户: ${userId}`)
        // a. 聚合计算用户的总收入和总支出
        const stats = await db.collection('bill').aggregate()
          .match({
            _openid: userId,
          })
          .group({
            _id: null,
            totalIncome: $.sum($.cond([$.gt(['$amount', 0]), '$amount', 0])),
            totalExpense: $.sum($.cond([$.lte(['$amount', 0]), '$amount', 0])),
          })
          .end()

        let accountData = {
          _id: userId,
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          name: '我的账户',
          last_updated: new Date()
        }

        if (stats.list.length > 0) {
          const { totalIncome, totalExpense } = stats.list[0]
          accountData.totalIncome = totalIncome
          accountData.totalExpense = totalExpense
          accountData.balance = totalIncome + totalExpense
        }

        console.log(`用户 ${userId} 的计算结果:`, accountData)

        // b. 使用 upsert 写入 account 集合，避免重复创建
        await db.collection('account').doc(userId).set({
          data: accountData
        })

        console.log(`用户 ${userId} 的账户信息已成功写入。`)
        successCount++
      } catch (e) {
        console.error(`处理用户 ${userId} 时发生错误:`, e)
        failCount++
      }
    }

    const summary = `数据迁移完成。成功: ${successCount} 个用户, 失败: ${failCount} 个用户。`
    console.log(summary)
    return { success: true, message: summary }

  } catch (e) {
    console.error('数据迁移脚本执行失败:', e)
    return { success: false, message: '数据迁移脚本执行失败。' }
  }
}
