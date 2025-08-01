const cloud = require('wx-server-sdk')
const { findOrCreate } = require('./utils.js')
const db = cloud.database()

/**
 * 保存账单（创建或更新），包含事务处理
 * @param {object} event - 云函数的原始 event 对象
 */
async function saveBill(event) {
  const { bill } = event
  if (!bill) {
    return { code: 400, message: '缺少 bill 对象' }
  }

  try {
    const result = await db.runTransaction(async (transaction) => {
      const billToSave = { ...bill }

      if (billToSave.datetime) {
        billToSave.datetime = new Date(billToSave.datetime)
      }

      if (bill.category && typeof bill.category === 'object') {
        if (bill.category._id) {
          billToSave.category_id = bill.category._id
        } else {
          const categoryId = await findOrCreate(transaction, 'category', bill.category.name, bill.category)
          billToSave.category_id = categoryId
        }
        delete billToSave.category
      }

      if (bill.tags && Array.isArray(bill.tags) && bill.tags.length > 0) {
        const tagIds = await Promise.all(
          bill.tags.map((tagObj) => {
            if (tagObj._id) {
              return tagObj._id
            }
            return findOrCreate(transaction, 'tag', tagObj.name, tagObj)
          }),
        )
        billToSave.tags = tagIds
      }

      if (billToSave._id) {
        const billId = billToSave._id
        delete billToSave._id
        await transaction.collection('bill').doc(billId).update({
          data: billToSave,
        })
        return { _id: billId, stats: { updated: 1 } }
      } else {
        const { _id } = await transaction.collection('bill').add({
          data: billToSave,
        })
        return { _id, stats: { created: 1 } }
      }
    })
    return { code: 200, message: '保存成功', data: result }
  } catch (e) {
    console.error('saveBill transaction error', e)
    return { code: 500, message: e.message || '数据库事务执行失败' }
  }
}

module.exports = {
  saveBill,
}
