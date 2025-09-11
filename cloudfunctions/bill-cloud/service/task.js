const cloud = require('wx-server-sdk')
const { BizError, tryParseJSON, tryStringifyJSON } = require('./helper.js')

const db = cloud.database()
const _ = db.command

/**
 * 创建一个新任务，包含 status、message 和 result 字段
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function createTask(event, models) {
  let { body } = event || {}
  if (!body) {
    body = {}
  }
  if (!body.message) {
    body.message = '任务已创建，等待处理...'
  }
  const { OPENID } = cloud.getWXContext()

  const taskData = {
    status: 'pending',
    message: JSON.stringify(body),
    result: null,
    _openid: OPENID,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const createTaskRes = await models.task.create({
    data: taskData,
  })

  return {
    taskId: createTaskRes.data.id,
  }
}

/**
 * 获取任务详情
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getTask(event, models) {
  const { taskId } = event.query
  const { OPENID } = cloud.getWXContext()

  if (!taskId) {
    throw new BizError('缺少 taskId 参数')
  }

  const taskRes = await models.task.get({
    filter: {
      where: {
        _id: { $eq: taskId },
        _openid: { $eq: OPENID },
      },
    },
  })

  if (!taskRes.data) {
    throw new BizError('找不到指定的任务或没有权限访问。')
  }

  const task = taskRes.data

  task.message = tryParseJSON(task.message)
  task.result = tryParseJSON(task.result)

  return task
}
/**
 * 更新任务状态和结果
 * @param {string} taskId - 任务 ID
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function updateTask(event, models) {
  const { taskId } = event.query
  const data = event.body
  const { OPENID } = cloud.getWXContext()

  if (!taskId) {
    throw new BizError('缺少 taskId 参数')
  }

  const updateData = {
    ...data,
    updatedAt: Date.now(),
  }

  // 统一序列化 message 和 result（如果为对象）
  updateData.message = tryStringifyJSON(updateData.message)
  updateData.result = tryStringifyJSON(updateData.result)

  return models.task.update({
    filter: {
      where: {
        _id: { $eq: taskId },
        _openid: { $eq: OPENID },
      },
    },
    data: updateData,
  })
}

/**
 * 删除任务
 * @param {object} event - 云函数的原始 event 对象
 */
async function deleteTask(event) {
  const { taskId } = event.query
  if (!taskId) {
    throw new Error('缺少 taskId 参数')
  }

  // 1. 获取任务详情以拿到 fileID
  const taskRes = await db.collection('task').doc(taskId).get()
  const task = taskRes.data
  if (task && task.result) {
    const result = tryParseJSON(task.result)
    if (result && result.fileID) {
      try {
        // 2. 如果有 fileID，则删除云存储中的文件
        await cloud.deleteFile({
          fileList: [result.fileID],
        })
      }
      catch (e) {
        console.error('删除云文件失败', e)
        // 即使文件删除失败，也继续尝试删除任务记录
      }
    }
  }

  // 3. 删除数据库中的任务记录
  const { stats } = await db.collection('task').doc(taskId).remove()
  return {
    deleted: stats.removed,
  }
}

module.exports = {
  createTask,
  getTask,
  updateTask,
  deleteTask,
}
