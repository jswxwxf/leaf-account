import { get } from './request-cloud.js'
import { tryParseJson } from '../utils/index.js'

/**
 * @typedef {object} Task
 * @property {string} _id - 唯一标识
 * @property {'pending' | 'processing' | 'completed' | 'failed'} status - 任务状态
 * @property {string} message - 任务信息 (JSON 字符串)
 * @property {object} [result] - 任务结果
 */

/**
 * 获取任务详情
 * @param {string} taskId - 任务的 _id
 * @returns {Promise<Task>}
 */
export function getTask(taskId) {
  return get('bill-cloud', {
    $url: '/get/task',
    query: { taskId },
  })
}
