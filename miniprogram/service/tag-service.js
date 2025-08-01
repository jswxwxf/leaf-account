import { addTags } from '@/api/tag.js'

/**
 * 创建一个默认的新标签对象
 * @returns {{name: string, type: string}}
 */
export function newTag() {
  return { name: '', type: '10' }
}

/**
 * 保存并合并标签。
 * 它会找出selectedTags中的新标签（没有_id的），调用API进行批量保存，
 * 然后将保存成功的新标签与原来已存在的旧标签合并后返回。
 * 批量保存新标签。
 * @param {Array<object>} newTags - 需要保存的新标签数组
 * @returns {Promise<Array<object>>} - 返回保存成功后的标签数组（包含_id）
 * @throws {Error} - 如果API调用失败或没有返回数据，则抛出错误
 */
export async function saveTags(newTags) {
  if (!newTags || newTags.length === 0) {
    return []
  }
  // 调用云函数批量保存
  const res = await addTags(newTags)
  if (res && res.data) {
    return res.data
  }
  // 让调用方处理UI提示
  throw new Error('保存新标签失败')
}
