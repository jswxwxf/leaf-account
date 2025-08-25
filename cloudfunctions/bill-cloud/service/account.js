const cloud = require('wx-server-sdk')
const ExcelJS = require('exceljs')
const dayjs = require('dayjs')
const { saveBill } = require('./bill.js')
const { createTask, updateTask } = require('./task.js')
const {
  BizError,
  deactivateAccount: _deactivateAccount,
  populateCategoriesForBills,
  populateTagsForBills,
} = require('./helper.js')

const db = cloud.database()
const _ = db.command

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
  const difference = actualBalance - systemBalance

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

async function updateAccount(event, models) {
  const { updateAccount: _updateAccount } = require('./helper.js')
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

async function exportAccount(event, models) {
  const { taskId } = await createTask({}, models)

  setTimeout(async () => {
    const { accountId, year } = event.query
    const { OPENID } = cloud.getWXContext()

    try {
      await updateTask(
        {
          query: { taskId },
          body: { status: 'processing', message: { text: '正在导出账单...' } },
        },
        models,
      )

      const yearStart = new Date(year, 0, 1).getTime()
      const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999).getTime()
      const account = await getAccount({ query: { accountId } }, models)

      let allBills = []
      const MAX_LIMIT = 1000
      let skip = 0
      while (true) {
        const billsRes = await db
          .collection('bill')
          .where({
            _openid: OPENID,
            account: accountId,
            datetime: _.gte(yearStart).and(_.lte(yearEnd)),
          })
          .orderBy('datetime', 'asc')
          .skip(skip)
          .limit(MAX_LIMIT)
          .get()
        if (billsRes.data.length === 0) break
        allBills = allBills.concat(billsRes.data)
        skip += MAX_LIMIT
      }

      allBills = await populateCategoriesForBills(allBills, models)
      allBills = await populateTagsForBills(allBills, models)

      await updateTask(
        {
          query: { taskId },
          body: {
            status: 'processing',
            message: { text: '账单数据拉取完成，正在生成文件...' },
          },
        },
        models,
      )

      const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
      const formattedBills = allBills.map((bill) => {
        const d = dayjs(bill.datetime)
        return {
          _id: bill._id,
          date: d.format('YYYY年MM月DD日') + ' ' + weekdays[d.day()],
          timestamp: bill.datetime,
          type: bill.category.type === '10' ? '收入' : '支出',
          category: bill.category.name,
          amount: bill.amount,
          note: bill.note || '',
          tags: bill.tags && bill.tags.length > 0 ? bill.tags.map((t) => t.name).join(', ') : '',
        }
      })

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(`${account.title}-${year}`)
      const title = `【${account.title}】${year}年度账单`
      worksheet.mergeCells('A1:J1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = title
      titleCell.font = { name: 'Calibri', size: 16, bold: true }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }

      const headerRow = worksheet.getRow(2)
      headerRow.values = [
        '日期', '类型', '分类', '金额', '备注', '标签', '每日收入', '每日支出', 'ID', '时间戳',
      ]
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
        row.eachCell({ includeEmpty: true }, function (cell) {
          cell.font = { name: 'Calibri', size: 13 }
        })

        const currentDate = row.getCell('A').value
        const nextRow = worksheet.getRow(rowNumber + 1)
        const nextDate = nextRow.getCell('A').value

        if (currentDate !== nextDate) {
          const range = `A3:A${worksheet.rowCount}`
          const amountRange = `D3:D${worksheet.rowCount}`
          const typeRange = `B3:B${worksheet.rowCount}`
          const tagsRange = `F3:F${worksheet.rowCount}`

          row.getCell('G').value = {
            formula: `SUMIFS(${amountRange}, ${range}, "${currentDate}", ${typeRange}, "收入", ${tagsRange}, "<>*不计入*")`,
            result: undefined,
          }

          row.getCell('H').value = {
            formula: `SUMIFS(${amountRange}, ${range}, "${currentDate}", ${typeRange}, "支出", ${tagsRange}, "<>*不计入*")`,
            result: undefined,
          }
        }
      })

      const buffer = await workbook.xlsx.writeBuffer()

      await updateTask(
        {
          query: { taskId },
          body: { status: 'processing', message: { text: '文件已生成，请等待下载...' } },
        },
        models,
      )

      const cloudPath = `exports/${OPENID}/${year}-${account.name}-${Date.now()}.xlsx`
      const uploadRes = await cloud.uploadFile({ cloudPath, fileContent: buffer })

      await updateTask(
        {
          query: { taskId },
          body: {
            status: 'completed',
            message: { text: '导出成功' },
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

async function importAccount(event, models) {
  const { taskId } = await createTask({}, models)

  setTimeout(async () => {
    const { accountId, fileID } = event.query
    const { OPENID } = cloud.getWXContext()
    const { saveBills: _saveBills } = require('./helper.js')

    try {
      await updateTask({
        query: { taskId },
        body: { status: 'processing', message: { text: '正在下载并解析文件...' } },
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
          const { getCategoryByNames, getTagsByNames } = require('./helper.js')
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
            result: { error: e.message },
          },
        },
        models,
      )
    }
  }, 0)

  return { taskId }
}


module.exports = {
  getAccount,
  getAccounts,
  reconcileAccount,
  deactivateAccount,
  updateAccount,
  getAccountYears,
  exportAccount,
  importAccount,
}
