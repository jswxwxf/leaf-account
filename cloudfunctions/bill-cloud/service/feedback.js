const cloud = require('wx-server-sdk')
const db = cloud.database()

/**
 * 添加一条新的用户反馈
 * @param {object} event - 云函数 event 对象
 * @param {object} models - CloudBase 数据模型
 * @returns {Promise<object>} - 数据库 add 操作的返回结果
 */
const addFeedback = async (event, models) => {
  const { content } = event.body
  const { OPENID } = cloud.getWXContext()

  if (!content) {
    throw new Error('反馈内容不能为空')
  }

  const collection = db.collection('feedback')

  const res = await collection.add({
    data: {
      content,
      _openid: OPENID,
      createdAt: new Date(),
    },
  })

  return res
}

module.exports = {
  addFeedback,
}
