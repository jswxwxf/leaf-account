import { post } from './request-cloud.js'

/**
 * 提交用户反馈
 * @param {string} content - 反馈内容
 */
export function postFeedback(content) {
  return post('bill-cloud', {
    $url: '/post/feedback',
    body: {
      content,
    },
  })
}
