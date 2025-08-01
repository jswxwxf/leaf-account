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

/**
 * 获取账单列表
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function getBills(event, models) {
  // 从 event 中解构出业务参数
  const { month } = event.query || {}
  const { pageSize = 200, pageNumber = 1 } = event.paging || {}
  try {
    const whereClause = {}
    // 如果传入了月份，则添加范围查询
    if (month) {
      const startDate = new Date(`${month}-01T00:00:00.000Z`)
      const nextMonthDate = new Date(startDate)
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)

      whereClause.datetime = models.command.gte(startDate).lt(nextMonthDate)
    }

    // 使用 .list() 方法进行查询，并使用 select 获取关联数据
    const { data } = await models.bill.list({
      select: {
        _id: true,
        amount: true,
        datetime: true,
        note: true,
        category: {
          _id: true,
          name: true,
          type: true,
        },
        tags: {
          _id: true,
          name: true,
          type: true,
        },
      },
      filter: {
        where: whereClause,
      },
      orderBy: [
        {
          datetime: 'desc',
        },
      ],
      pageSize,
      pageNumber,
    })

    return {
      code: 200,
      message: '获取成功',
      data: data.records,
    }
  } catch (e) {
    console.error('getBills error', e)
    return {
      code: 500,
      message: e.message || '数据库查询失败',
    }
  }
}

module.exports = {
  saveBill,
  getBills,
}
