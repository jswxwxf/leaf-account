/**
 * 保存账单（创建或更新）。
 * 利用数据模型自动处理 category 和 tags 的关联。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function saveBill(event, models) {
  const { bill } = event.body
  if (!bill) {
    return { code: 400, message: '请求中缺少 bill 对象' }
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
      await models.bill.update({
        data: billToSave,
        filter: {
          where: {
            _id: {
              $eq: billId, // 推荐传入_id数据标识进行操作
            },
          },
        },
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
async function getBillsByDate(event, models) {
  // 从 event.query 中解构出 startDate，首次调用可能为空
  const { startDate: startDateStr } = event.query || {}

  try {
    // 1. 高效获取数据表的总记录数
    const {
      data: { total: totalBills },
    } = await models.bill.list({
      pageSize: 1,
      pageNumber: 1,
      getCount: true,
    })

    let currentDate = startDateStr ? new Date(startDateStr) : new Date()
    let accumulatedBills = []
    const MIN_RECORDS = 30
    let loopCount = 0 // 防止无限循环
    const MAX_LOOP = 10 // 最多查询一年

    // 2. 使用正确的总数作为循环终止条件
    while (
      accumulatedBills.length < MIN_RECORDS &&
      accumulatedBills.length < totalBills &&
      loopCount < MAX_LOOP
    ) {
      // 设置查询的日期范围为一整天
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)

      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)

      const whereClause = {
        $and: [
          {
            datetime: { $gte: dayStart.getTime() },
          },
          { datetime: { $lte: dayEnd.getTime() } },
        ],
      }

      // 3. 循环内不再需要 getCount
      const {
        data: { records: dailyBills },
      } = await models.bill.list({
        select: {
          _id: true,
          amount: true,
          datetime: true,
          note: true,
          category: { _id: true, name: true, type: true },
          tags: { _id: true, name: true, type: true },
        },
        filter: { where: whereClause },
        orderBy: [{ datetime: 'desc' }],
        pageSize: 1000, // 获取当天所有数据
      })

      if (dailyBills && dailyBills.length > 0) {
        accumulatedBills = accumulatedBills.concat(dailyBills)
      }

      // 更新日期为前一天，为下一次循环做准备
      currentDate.setDate(currentDate.getDate() - 1)
      loopCount++
    }

    // 4. 检查是否已加载全部数据
    const allDataLoaded = accumulatedBills.length >= totalBills

    return {
      code: 200,
      message: '获取成功',
      data: accumulatedBills,
      // 如果全部加载完，则 nextStartDate 为 null，告知前端停止请求
      nextStartDate: allDataLoaded ? null : currentDate.toISOString().split('T')[0],
    }
  } catch (e) {
    console.error('getBills error', e)
    return {
      code: 500,
      message: e.message || '数据库查询失败',
    }
  }
}

/**
 * 删除账单。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 */
async function deleteBill(event, models) {
  const { id } = event
  if (!id) {
    return { code: 400, message: '请求中缺少 id 参数' }
  }

  try {
    const result = await models.bill.delete({
      filter: {
        where: {
          _id: {
            $eq: id,
          },
        },
      },
    })

    if (result.data.count > 0) {
      return { code: 200, message: '删除成功' }
    } else {
      return { code: 404, message: '未找到要删除的记录' }
    }
  } catch (e) {
    console.error('deleteBill error', e)
    return { code: 500, message: e.message || '数据库操作失败' }
  }
}

module.exports = {
  saveBill,
  getBillsByDate,
  deleteBill,
}
