/**
 * 保存账单（创建或更新）。
 * 利用数据模型自动处理 category 和 tags 的关联。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBill(event, models) {
  const { bill } = event
  if (!bill) {
    return { code: 400, message: '缺少 bill 对象' }
  }

  try {
    const billToSave = { ...bill }

    // 如果是支出，确保 amount 是负数
    if (billToSave.category?.type === '20' && billToSave.amount > 0) {
      billToSave.amount = -billToSave.amount
    }

    let savedBill
    if (billToSave._id) {
      // 更新逻辑
      const billId = billToSave._id
      delete billToSave._id
      await models.bill.where({ _id: billId }).update({
        data: billToSave,
      })
      // 更新成功后，返回完整的账单对象
      savedBill = { ...billToSave, _id: billId }
    } else {
      // 新增逻辑
      const createResult = await models.bill.create({
        data: billToSave,
      })
      const { id } = createResult.data
      // 创建成功后，返回带有新 _id 的完整账单对象
      savedBill = { ...billToSave, _id: id }
    }

    return { code: 200, message: '保存成功', data: savedBill }
  } catch (e) {
    console.error('saveBill error', e)
    return { code: 500, message: e.message || '数据库操作失败' }
  }
}

module.exports = {
  saveBill,
}
