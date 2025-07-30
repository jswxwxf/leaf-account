const cloud = require('wx-server-sdk')
const { findOrCreate } = require('../utils.js')

/**
 * 保存账单（创建或更新）
 * @param {object} event - 云函数的原始 event 对象
 */
async function saveBill(event) {
  const { bill } = event
  if (!bill) {
    return { code: 400, message: '缺少 bill 对象' }
  }

  const billToSave = { ...bill }

  // 1. 处理 category
  if (bill.category && typeof bill.category === 'string') {
    const categoryId = await findOrCreate('category', bill.category)
    billToSave.category_id = categoryId
    delete billToSave.category
  }

  // 2. 处理 tags
  if (bill.tags && Array.isArray(bill.tags) && bill.tags.length > 0) {
    const tagIds = await Promise.all(
      bill.tags.map(tagName => findOrCreate('tag', tagName)),
    )
    billToSave.tags = tagIds
  }

  // 3. 保存 bill
  let result
  if (billToSave._id) {
    // 更新
    const billId = billToSave._id
    delete billToSave._id
    result = await cloud.callFunction({
      name: 'data',
      data: { $url: '/bill', action: 'update', id: billId, data: billToSave },
    })
  } else {
    // 新增
    result = await cloud.callFunction({
      name: 'data',
      data: { $url: '/bill', action: 'add', data: billToSave },
    })
  }
  return result
}

module.exports = {
  saveBill,
}
