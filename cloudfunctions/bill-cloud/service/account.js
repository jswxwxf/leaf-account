const cloud = require('wx-server-sdk')
const ExcelJS = require('exceljs')
const dayjs = require('dayjs')
const { createTask, updateTask } = require('./task.js')
const {
  BizError,
} = require('./helper.js')
const { populateCategoriesForBills } = require('./category.js')
const { populateTagsForBills } = require('./tag.js')

const db = cloud.database()
const _ = db.command


/**
 * 更新账户核心逻辑。
 * 可用于增加/减少余额、收入、支出，或修改标题。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 可选的数据库或事务实例
 * @returns {Promise<object>} - 更新后的账户对象
 */
async function _updateAccount(event, models, dbOrTransaction) {
  const { accountId } = event.query || {}
  const { balanceIncrement, incomeIncrement, expenseIncrement } = event.body || {}
  let { title, showInStats } = event.body || {}
  if (typeof title === 'string') {
    title = title.trim()
  }
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  const accountCollection = dbInstance.collection('account')

  const where = {
    _id: accountId,
    _openid: OPENID,
  }

  const { data: accounts } = await accountCollection.where(where).limit(1).get()

  if (!accounts || accounts.length === 0) {
    throw new Error(`找不到 ID 为 ${accountId} 的账户，或没有权限操作。`)
  }

  const updateData = {}
  if (balanceIncrement) updateData.balance = _.inc(balanceIncrement)
  if (incomeIncrement) updateData.totalIncome = _.inc(incomeIncrement)
  if (expenseIncrement) updateData.totalExpense = _.inc(expenseIncrement)
  if (title) updateData.title = title
  if (typeof showInStats === 'boolean') updateData.showInStats = showInStats

  if (Object.keys(updateData).length === 0) return accounts[0]

  updateData.updatedAt = Date.now()
  updateData.updatedBy = OPENID

  const result = await accountCollection.where(where).update({ data: updateData })

  if (result.stats.updated === 0) {
    throw new Error('更新用户账户失败')
  }
  const { data: newAccounts } = await accountCollection.where(where).limit(1).get()
  if (newAccounts && newAccounts.length > 0) {
    const account = newAccounts[0]
    delete account._openid
    account.isOpened = true
    return account
  }
  throw new Error('更新用户账户失败')
}

/**
 * 异步重算并更新指定账户的余额、总收入和总支出。
 * 这是一个“即发即忘”的函数，用于后台数据校准。
 * @param {string} accountId - 需要重算的账户ID
 * @param {string} OPENID - 用户的 OPENID
 */
async function recalculateAccountBalance(accountId, OPENID) {
  try {
    const accountRes = await db.collection('account').doc(accountId).get()
    if (!accountRes.data) return

    const account = accountRes.data
    const $ = db.command.aggregate
    const aggregateResult = await db
      .collection('bill')
      .aggregate()
      .match({ account: accountId, _openid: OPENID })
      .group({
        _id: null,
        totalIncome: $.sum($.cond([$.gt(['$amount', 0]), '$amount', 0])),
        totalExpense: $.sum($.cond([$.lt(['$amount', 0]), '$amount', 0])),
      })
      .end()

    const summary = aggregateResult.list[0] || { totalIncome: 0, totalExpense: 0 }
    const newTotalIncome = summary.totalIncome
    const newTotalExpense = summary.totalExpense
    const newBalance = newTotalIncome + newTotalExpense

    if (
      Math.abs(account.balance - newBalance) > 0.01 ||
      Math.abs(account.totalIncome - newTotalIncome) > 0.01 ||
      Math.abs(account.totalExpense - newTotalExpense) > 0.01
    ) {
      await db.collection('account').doc(accountId).update({
        data: {
          balance: newBalance,
          totalIncome: newTotalIncome,
          totalExpense: newTotalExpense,
          updatedAt: Date.now(),
        },
      })
    }
  } catch (err) {
    console.error(`Error recalculating account ${accountId}:`, err)
  }
}

/**
 * 获取或创建用户账本。
 * 如果提供了 accountId，则直接获取该账本。
 * 如果提供了 name，则先查找用户自己的账本，若不存在，则从公共模板创建。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<object>} - 账本对象
 */
async function getAccount(event, models) {
  const { name = 'leaf-maple', accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  if (accountId) {
    const accountRes = await models.account.get({
      filter: {
        where: {
          _id: { $eq: accountId },
          _openid: { $eq: OPENID },
        },
      },
    })
    if (accountRes.data) {
      const account = accountRes.data
      setTimeout(() => recalculateAccountBalance(accountId, OPENID), 0)
      delete account._openid
      return account
    }
    throw new BizError(`找不到 ID 为 ${accountId} 的账本，或没有权限访问。`)
  }

  const userAccountRes = await models.account.list({
    filter: {
      where: {
        _openid: { $eq: OPENID },
        name: { $eq: name },
      },
    },
    page: 1,
    pageSize: 1,
  })

  if (userAccountRes.data && userAccountRes.data.records.length > 0) {
    const account = userAccountRes.data.records[0]
    setTimeout(() => recalculateAccountBalance(account._id, OPENID), 0)
    delete account._openid
    return account
  }

  const publicAccountRes = await models.account.list({
    filter: {
      where: {
        _openid: { $empty: true },
        name: { $eq: name },
      },
    },
    page: 1,
    pageSize: 1,
  })

  if (publicAccountRes.data && publicAccountRes.data.records.length > 0) {
    const publicAccount = publicAccountRes.data.records[0]
    const newAccountData = {
      ...publicAccount,
      createdAt: Date.now(),
      createdBy: OPENID,
      updatedAt: Date.now(),
      updatedBy: OPENID,
      _openid: OPENID,
    }
    delete newAccountData._id

    const createRes = await models.account.create({
      data: newAccountData,
    })

    const createdAccount = await models.account.get({
      filter: {
        where: {
          _id: { $eq: createRes.data.id },
        },
      },
    })
    delete createdAccount.data._openid
    return createdAccount.data
  }

  throw new BizError(`名为 "${name}" 的账本不存在，请检查账本名称或联系管理员。`)
}

/**
 * 对账功能。
 * 计算实际余额与系统余额的差异，并创建一条调整账单以抹平差异。
 * @param {object} event - 云函数事件对象，body 中应包含 actualBalance
 * @param {object} models - 数据模型实例
 * @returns {Promise<object>} - 更新后的账本对象
 */
async function reconcileAccount(event, models) {
  const { accountId } = event.query
  const { actualBalance } = event.body
  const { OPENID } = cloud.getWXContext()

  if (typeof actualBalance !== 'number') {
    throw new Error('缺少有效的 actualBalance 参数')
  }

  const currentAccount = await getAccount(
    { ...event, query: { ...event.query, accountId } },
    models,
  )
  const systemBalance = currentAccount.balance
  const difference = parseFloat((actualBalance - systemBalance).toFixed(2))

  if (Math.abs(difference) < 0.01) {
    return currentAccount
  }

  const isIncome = difference > 0
  const categoryName = isIncome ? '增余额' : '减余额'
  const categoryType = isIncome ? '10' : '20'

  const {
    data: { records: categories },
  } = await models.category.list({
    filter: {
      where: {
        name: { $eq: categoryName },
        type: { $eq: categoryType },
        _openid: { $empty: true },
      },
    },
    page: 1,
    pageSize: 1,
  })

  if (!categories || categories.length === 0) {
    throw new Error(`找不到内置分类: ${categoryName}`)
  }
  const category = categories[0]

  const reconcileBill = {
    amount: difference,
    category: {
      _id: category._id,
      name: category.name,
      type: category.type,
    },
    datetime: Date.now(),
    note: `对账调整`,
  }

  const saveBillEvent = {
    ...event,
    query: {
      accountId,
    },
    body: {
      bill: reconcileBill,
    },
  }

  const { saveBill } = require('./bill.js')
  await saveBill(saveBillEvent, models)

  return getAccount({ ...event, query: { ...event.query, accountId } }, models)
}

/**
 * 获取所有可用账本列表。
 * 根据 `opened` 参数可以筛选已启用、未启用或所有账本。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<Array<object>>} - 账本列表
 */
async function getAccounts(event, models) {
  const { opened } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  const privateAccountsRes = await models.account.list({
    filter: {
      where: {
        _openid: { $eq: OPENID },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    pageSize: 100,
  })
  const privateAccounts = (privateAccountsRes.data.records || []).map((acc) => {
    delete acc._openid
    return { ...acc, isOpened: true }
  })

  if (opened === 'true' || opened === true) {
    return privateAccounts
  }

  const publicAccountsRes = await models.account.list({
    filter: {
      where: {
        _openid: { $empty: true },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    pageSize: 100,
  })
  const publicAccounts = (publicAccountsRes.data.records || []).map((acc) => {
    delete acc._openid
    return { ...acc, isOpened: false }
  })

  const privateAccountNames = new Set(privateAccounts.map((a) => a.name))
  const availablePublicAccounts = publicAccounts.filter((pa) => !privateAccountNames.has(pa.name))

  if (opened === 'false' || opened === false) {
    return availablePublicAccounts
  }

  return [...privateAccounts, ...availablePublicAccounts]
}

/**
 * 停用（删除）一个账本及其所有关联数据。
 * 这是一个事务性操作，会回滚所有更改如果中途出错。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<object>} - 操作结果
 */
async function deactivateAccount(event, models) {
  const transaction = await db.startTransaction()
  try {
    const result = await _deactivateAccount(event, models, transaction)
    await transaction.commit()
    return result
  } catch (e) {
    await transaction.rollback()
    if (e.isBiz) {
      throw e
    }
    console.error('deactivateAccount transaction error:', e)
    throw new Error('删除账本失败，请稍后重试。')
  }
}

/**
 * 更新账本信息（例如，重命名）。
 * 这是一个事务性操作。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<object>} - 更新后的账本对象
 */
async function updateAccount(event, models) {
  const transaction = await db.startTransaction()
  try {
    const result = await _updateAccount(event, models, transaction)
    await transaction.commit()
    return result
  } catch (e) {
    await transaction.rollback()
    if (e.isBiz) {
      throw e
    }
    console.error('updateAccount transaction error:', e)
    throw new Error('更新账户失败，请稍后重试。')
  }
}

/**
 * 获取指定账本中存在账单的所有年份。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<Array<number>>} - 年份数组
 */
async function getAccountYears(event, models) {
  const { accountId } = event.query
  const { OPENID } = cloud.getWXContext()

  const $ = db.command.aggregate

  const result = await db
    .collection('bill')
    .aggregate()
    .match({
      _openid: OPENID,
      account: accountId,
    })
    .addFields({
      convertedDate: { $toDate: '$datetime' },
    })
    .project({
      year: { $year: '$convertedDate' },
    })
    .group({
      _id: '$year',
    })
    .sort({
      _id: -1,
    })
    .end()

  return result.list.map((item) => item._id)
}


/**
 * 获取账本的账单时间范围.
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<{minDate: number, maxDate: number}>} - 包含最早和最晚时间戳的对象
 */
async function getAccountPeriod(event, models) {
  const { accountId } = event.query
  const { OPENID } = cloud.getWXContext()

  const $ = db.command.aggregate

  // 1. 使用聚合一次性找出最早和最晚的账单日期
  const aggregateResult = await db
    .collection('bill')
    .aggregate()
    .match({
      _openid: OPENID,
      account: accountId,
    })
    .group({
      _id: null,
      minDate: $.min('$datetime'),
      maxDate: $.max('$datetime'),
    })
    .end()

  if (aggregateResult.list.length === 0) {
    return []
  }

  const { minDate, maxDate } = aggregateResult.list[0]

  // 2. 直接返回 minDate 和 maxDate 的时间戳
  return {
    minDate,
    maxDate,
  }
}

/**
 * 导出账本的所有账单数据为 Excel 文件。
 * 这是一个异步任务，会逐步更新任务进度。
 * 1. 拉取所有账单数据。
 * 2. 关联账单的分类和标签信息。
 * 3. 生成 Excel 文件。
 * 4. 上传文件到云存储。
 * 5. 返回文件 ID。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @returns {Promise<{taskId: string}>} - 异步任务ID
 */
async function exportAccount(event, models) {
  const { taskId } = await createTask({}, models)

  setTimeout(async () => {
    const { accountId } = event.query
    const { OPENID } = cloud.getWXContext()

    try {
      // 1. 初始化任务状态
      await updateTask(
        {
          query: { taskId },
          body: { status: 'processing', message: { text: '正在准备导出...', progress: 0 } },
        },
        models,
      )

      const account = await getAccount({ query: { accountId } }, models)

      // 2. 分批拉取所有账单，并更新进度 (0% -> 40%)
      const countResult = await db.collection('bill').where({ _openid: OPENID, account: accountId }).count()
      const totalBills = countResult.total
      let allBills = []
      if (totalBills > 0) {
        const MAX_LIMIT = 1000
        let skip = 0
        while (skip < totalBills) {
          const billsRes = await db.collection('bill').where({
            _openid: OPENID,
            account: accountId,
          }).orderBy('datetime', 'asc').skip(skip).limit(MAX_LIMIT)
            .get()

          allBills = allBills.concat(billsRes.data)
          skip += MAX_LIMIT
          const progress = Math.round((allBills.length / totalBills) * 40)
          await updateTask({
            query: { taskId },
            body: { status: 'processing', message: { text: `正在拉取数据... (${allBills.length}/${totalBills})`, progress } },
          }, models)
        }
      }

      // 3. 分批处理账单（关联分类和标签），并更新进度 (40% -> 80%)
      await updateTask({
        query: { taskId },
        body: { status: 'processing', message: { text: '数据拉取完成，正在处理...', progress: 40 } },
      }, models)

      if (totalBills > 0) {
        let processedCount = 0
        for (let i = 0; i < allBills.length; i += 20) {
          const batch = allBills.slice(i, i + 20)
          const populatedBatch = await populateCategoriesForBills(batch, models)
          const finalBatch = await populateTagsForBills(populatedBatch, models)
          allBills.splice(i, finalBatch.length, ...finalBatch)
          processedCount += batch.length
          const progress = 40 + Math.round((processedCount / totalBills) * 40)
          await updateTask({
            query: { taskId },
            body: { status: 'processing', message: { text: `正在处理数据... (${processedCount}/${totalBills})`, progress } },
          }, models)
        }
      }

      // 4. 生成 Excel 文件，并更新进度 (80% -> 90%)
      await updateTask({
        query: { taskId },
        body: { status: 'processing', message: { text: '数据处理完成，正在生成文件...', progress: 80 } },
      }, models)

      const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
      const formattedBills = allBills.map((bill, index) => {
        const rowNumber = index + 3 // Excel行号从3开始（标题占2行）
        return {
          _id: bill._id,
          date: {
            formula: `TEXT(J${rowNumber}/1000/86400+25569+8/24, "yyyy""年""mm""月""dd""日"" aaaa")`,
          },
          timestamp: bill.datetime,
          type: bill.category.type === '10' ? '收入' : '支出',
          category: bill.category.name,
          amount: bill.amount,
          note: bill.note || '',
          tags: bill.tags && bill.tags.length > 0 ? bill.tags.map((t) => t.name).join(', ') : '',
        }
      })

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(`${account.title}`)
      const title = `【${account.title}】账单`
      worksheet.mergeCells('A1:J1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = title
      titleCell.font = { name: 'Calibri', size: 16, bold: true }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      const headerRow = worksheet.getRow(2)
      headerRow.values = ['日期', '类型', '分类', '金额', '备注', '标签', '每日收入', '每日支出', 'ID', '时间戳']
      headerRow.font = { name: 'Calibri', size: 13, bold: true }
      worksheet.columns = [
        { key: 'date', width: 25 }, { key: 'type', width: 10 }, { key: 'category', width: 15 },
        { key: 'amount', width: 15 }, { key: 'note', width: 30 }, { key: 'tags', width: 20 },
        { key: 'dailyIncome', width: 15 }, { key: 'dailyExpense', width: 15 },
        { key: '_id', width: 30 }, { key: 'timestamp', width: 18 },
      ]
      worksheet.addRows(formattedBills)
      worksheet.eachRow({ includeEmpty: false }, function (row, rowNumber) {
        if (rowNumber <= 2) return
        row.eachCell({ includeEmpty: true }, function (cell) { cell.font = { name: 'Calibri', size: 13 } })
        const currentDate = row.getCell('A').value
        const nextRow = worksheet.getRow(rowNumber + 1)
        const nextDate = nextRow.getCell('A').value
        if (currentDate !== nextDate) {
          const range = `A3:A${worksheet.rowCount}`
          const amountRange = `D3:D${worksheet.rowCount}`
          const typeRange = `B3:B${worksheet.rowCount}`
          const tagsRange = `F3:F${worksheet.rowCount}`
          row.getCell('G').value = { formula: `SUMIFS(${amountRange}, ${range}, "${currentDate}", ${typeRange}, "收入", ${tagsRange}, "<>*非日常*")`, result: undefined }
          row.getCell('H').value = { formula: `SUMIFS(${amountRange}, ${range}, "${currentDate}", ${typeRange}, "支出", ${tagsRange}, "<>*非日常*")`, result: undefined }
        }
      })
      const buffer = await workbook.xlsx.writeBuffer()

      // 5. 上传文件，并更新进度 (90% -> 100%)
      await updateTask(
        {
          query: { taskId },
          body: { status: 'processing', message: { text: '文件已生成，正在上传...', progress: 90 } },
        },
        models,
      )

      const cloudPath = `exports/${OPENID}/${account.name}-${Date.now()}.xlsx`
      const uploadRes = await cloud.uploadFile({ cloudPath, fileContent: buffer })

      // 6. 完成任务
      await updateTask(
        {
          query: { taskId },
          body: {
            status: 'completed',
            message: { text: '导出成功', progress: 100 },
            result: { fileID: uploadRes.fileID },
          },
        },
        models,
      )
    } catch (e) {
      console.error('导出任务失败:', e)
      await updateTask(
        {
          query: { taskId },
          body: {
            status: 'failed',
            message: { text: '导出失败，请稍后重试' },
            result: { error: e.message },
          },
        },
        models,
      )
    }
  }, 0)

  return { taskId }
}

/**
 * 从 Excel 文件导入账单数据。
 * 这是一个危险操作，会先清空目标账本的所有现有数据。
 * 这是一个异步任务，会逐步更新任务进度。
 * 1. 解析上传的 Excel 文件。
 * 2. 清空旧数据。
 * 3. 批量导入新数据。
 * @param {object} event - 云函数事件对象, query 中应包含 fileID
 * @param {object} models - 数据模型实例
 * @returns {Promise<{taskId: string}>} - 异步任务ID
 */
async function importAccount(event, models) {
  const { taskId } = await createTask({}, models)

  setTimeout(async () => {
    const { accountId, fileID } = event.query
    const { OPENID } = cloud.getWXContext()
    const { _saveBills } = require('./bill.js')

    try {
      await updateTask({
        query: { taskId },
        body: { status: 'processing', message: { text: '正在下载并解析文件...' }, result: { fileID } },
      }, models)

      const downloadRes = await cloud.downloadFile({ fileID })
      const buffer = downloadRes.fileContent
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)
      const worksheet = workbook.worksheets[0]

      const billsFromExcel = []
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber <= 2) return;
        const type = row.getCell(2).value.trim()
        const categoryName = row.getCell(3).value.trim()
        const amount = parseFloat(row.getCell(4).value)
        const note = row.getCell(5).value || ''
        const tagsRaw = row.getCell(6).value || ''
        const datetime = new Date(row.getCell(10).value).getTime()
        const originBill = row.getCell(9).value || null

        if (!type || !categoryName || isNaN(amount) || isNaN(datetime) || !originBill) {
          console.warn(`Skipping invalid row ${rowNumber}:`, row.values)
          return
        }
        const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        billsFromExcel.push({
          type: type === '收入' ? '10' : '20',
          categoryName, amount, note, datetime, tags, originBill,
        })
      })

      await updateTask({
        query: { taskId },
        body: { status: 'processing', message: { text: '文件解析完成，正在清空旧数据...' } },
      }, models)

      // 清空账本数据
      await db.collection('bill').where({ account: accountId, _openid: OPENID }).remove()
      await models.account.update({
        filter: { where: { _id: { $eq: accountId } } },
        data: { balance: 0, totalIncome: 0, totalExpense: 0 },
      })

      let processedCount = 0
      const totalCount = billsFromExcel.length

      await updateTask({
        query: { taskId },
        body: { status: 'processing', message: { text: '旧数据已清空，准备导入新数据...' } },
      }, models)

      if (billsFromExcel.length > 0) {
          const { getCategoryByNames } = require('./category.js')
          const { getTagsByNames } = require('./tag.js')
          const tagNames = [...new Set(billsFromExcel.flatMap(b => b.tags))]
          const tags = await getTagsByNames({ query: { names: tagNames } }, models)
          const tagMap = new Map(tags.map(t => [t.name, t]))
          const categoriesInfo = [...new Map(billsFromExcel.map(b => [`${b.categoryName}-${b.type}`, b])).values()].map(b => ({ name: b.categoryName, type: b.type }))
          const categories = await getCategoryByNames({ query: { categories: categoriesInfo } }, models)
          const categoryMap = new Map(categories.map(c => [`${c.name}-${c.type}`, c]))

          const processedNewBills = billsFromExcel.map(billData => {
            const category = categoryMap.get(`${billData.categoryName}-${billData.type}`)
            if (!category) return null
            const tags = billData.tags.map(tagName => tagMap.get(tagName)).filter(Boolean)
            return { ...billData, category, tags }
          }).filter(Boolean)

          const BATCH_SIZE = 10
          for (let i = 0; i < processedNewBills.length; i += BATCH_SIZE) {
            const batch = processedNewBills.slice(i, i + BATCH_SIZE)
            const transaction = await db.startTransaction()
            try {
              await _saveBills(batch, accountId, models, transaction)
              await transaction.commit()
              processedCount += batch.length
              await updateTask({
                query: { taskId },
                body: { status: 'processing', message: { text: `正在导入... (${processedCount}/${totalCount})`, progress: Math.round((processedCount/totalCount) * 100) } },
              }, models)
            } catch(batchError) {
              await transaction.rollback()
              throw batchError
            }
          }
      }

      await updateTask(
        {
          query: { taskId },
          body: { status: 'completed', message: { text: '导入成功' } },
        },
        models,
      )
    } catch (e) {
      console.error('导入任务失败:', e)
      await updateTask(
        {
          query: { taskId },
          body: {
            status: 'failed',
            message: { text: '导入失败，请检查文件格式或联系管理员' },
            result: { error: e.message, fileID },
          },
        },
        models,
      )
    }
  }, 0)

  return { taskId }
}


/**
 * 停用（删除）账本的核心逻辑。
 * 会删除账本下的所有账单，并处理关联的转账记录。
 * @param {object} event - 云函数事件对象
 * @param {object} models - 数据模型实例
 * @param {object} dbOrTransaction - 数据库事务实例
 * @returns {Promise<object>} - 操作结果
 */
async function _deactivateAccount(event, models, dbOrTransaction) {
  const { accountId } = event.query
  const { OPENID } = cloud.getWXContext()

  // 1. 验证用户对目标账本的所有权
  const accountRes = await dbOrTransaction.collection('account').doc(accountId).get()
  if (!accountRes.data || accountRes.data._openid !== OPENID) {
    throw new BizError(`找不到 ID 为 ${accountId} 的账本，或没有权限删除。`)
  }

  // 2. 找到账本内的所有账单ID
  const billsInAccountRes = await dbOrTransaction
    .collection('bill')
    .where({
      account: _.eq(accountId),
      _openid: _.eq(OPENID),
    })
    .get()
  const billIdsInAccount = (billsInAccountRes.data || []).map((b) => b._id)

  // 3. 查找并处理与其他账本关联的转账账单
  // 如果A账本的账单被B账本的转账账单关联，删除A账本时，需要处理B账本的关联记录
  const relatedBillsRes = await dbOrTransaction
    .collection('bill')
    .where({
      relatedBill: _.in(billIdsInAccount),
      _openid: _.eq(OPENID),
    })
    .get()
  const relatedBills = relatedBillsRes.data || []

  // 解除关联关系，防止留下悬空引用
  if (relatedBills.length > 0) {
    const batchSize = 3 // 分批处理，避免单次操作数据量过大
    for (let i = 0; i < relatedBills.length; i += batchSize) {
      const batch = relatedBills.slice(i, i + batchSize)
      const updatePromises = batch.map((bill) => {
        return dbOrTransaction
          .collection('bill')
          .doc(bill._id)
          .update({
            data: {
              // 将被删除的关联ID存起来，以备追溯
              deletedRelatedBill: bill.relatedBill,
              // 原子操作：移除字段
              relatedBill: _.remove(),
            },
          })
      })
      await Promise.all(updatePromises)
    }
  }

  // 4. 删除账本内的所有账单
  let deletedCount = 0
  if (billIdsInAccount.length > 0) {
    const deleteResult = await dbOrTransaction
      .collection('bill')
      .where({
        _id: _.in(billIdsInAccount),
      })
      .remove()
    deletedCount = deleteResult.stats.removed
  }

  // 5. 删除账本本身
  await dbOrTransaction.collection('account').doc(accountId).remove()

  // 6. 返回操作结果
  return {
    success: true,
    message: '账本及其所有账单已删除，关联转账记录已处理',
    deletedBills: deletedCount,
  }
}

module.exports = {
  getAccount,
  getAccounts,
  reconcileAccount,
  _deactivateAccount,
  deactivateAccount,
  _updateAccount,
  updateAccount,
  getAccountYears,
  getAccountPeriod,
  exportAccount,
  importAccount,
}
