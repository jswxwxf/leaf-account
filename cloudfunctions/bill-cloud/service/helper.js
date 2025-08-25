const cloud = require('wx-server-sdk')
const { getTagsByIds } = require('./tag.js')

const db = cloud.database()
const _ = db.command

class BizError extends Error {
  constructor(message) {
    super(message)
    this.isBiz = true
  }
}

async function updateAccount(event, models, dbOrTransaction) {
  const { accountId } = event.query || {}
  const { balanceIncrement, incomeIncrement, expenseIncrement } = event.body || {}
  let { title } = event.body || {}
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

function parseMoney(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) {
    return 0
  }
  return Number(num.toFixed(2))
}

function tryParseJSON(str) {
  if (typeof str !== 'string') {
    return str
  }
  try {
    return JSON.parse(str)
  } catch (e) {
    return str
  }
}

function tryStringifyJSON(value) {
  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value)
    } catch (e) {
      return String(value)
    }
  }
  return value
}

async function populateTagsForBills(bills, models) {
  if (bills.length > 0) {
    const allTagIds = [...new Set(bills.flatMap((bill) => bill.tags || []).filter(Boolean))]

    if (allTagIds.length > 0) {
      const tags = await getTagsByIds({ query: { ids: allTagIds } }, models)
      const tagsMap = new Map(tags.map((tag) => [tag._id, tag]))

      bills.forEach((bill) => {
        if (Array.isArray(bill.tags)) {
          bill.tags = bill.tags.map((tagId) => tagsMap.get(tagId)).filter(Boolean)
        }
      })
    }
  }
  return bills
}

async function saveBill(billToSave, accountId, models, dbOrTransaction) {
  const { OPENID } = cloud.getWXContext()
  const originalBill = { ...billToSave }
  let savedBillId

  if (billToSave.category?.type === '10' && billToSave.amount < 0) {
    billToSave.amount = -billToSave.amount
  } else if (billToSave.category?.type === '20' && billToSave.amount > 0) {
    billToSave.amount = -billToSave.amount
  }

  const categoryId = billToSave.category?._id
  billToSave.category = categoryId

  if (Array.isArray(billToSave.tags)) {
    billToSave.tags = billToSave.tags.map((tag) => tag._id).filter(Boolean)
  }

  const dataToSave = { ...billToSave }
  if (dataToSave.originBill) {
    dataToSave.originBill = billToSave.originBill
  }

  if (billToSave._id) {
    const billId = billToSave._id
    delete dataToSave._id
    delete dataToSave.originBill

    const oldBillRes = await dbOrTransaction.collection('bill').doc(billId).get()
    if (!oldBillRes.data) throw new Error(`找不到 ID 为 ${billId} 的账单`)
    const oldBill = oldBillRes.data

    if (oldBill._openid && oldBill._openid !== OPENID) {
      throw new Error(`没有权限修改账单 ${billId}`)
    }

    const balanceIncrement = parseMoney(dataToSave.amount - oldBill.amount)
    const incomeIncrement = parseMoney(
      (dataToSave.amount > 0 ? dataToSave.amount : 0) - (oldBill.amount > 0 ? oldBill.amount : 0),
    )
    const expenseIncrement = parseMoney(
      (oldBill.amount < 0 ? Math.abs(oldBill.amount) : 0) - (dataToSave.amount < 0 ? Math.abs(dataToSave.amount) : 0),
    )

    await updateAccount(
      { query: { accountId }, body: { balanceIncrement, incomeIncrement, expenseIncrement } },
      models,
      dbOrTransaction,
    )
    await dbOrTransaction
      .collection('bill')
      .doc(billId)
      .update({ data: { ...dataToSave, updatedAt: Date.now(), updatedBy: OPENID } })
    savedBillId = billId
  } else {
    const balanceIncrement = dataToSave.amount
    const incomeIncrement = balanceIncrement > 0 ? balanceIncrement : 0
    const expenseIncrement = balanceIncrement < 0 ? Math.abs(balanceIncrement) : 0

    await updateAccount(
      { query: { accountId }, body: { balanceIncrement, incomeIncrement, expenseIncrement } },
      models,
      dbOrTransaction,
    )
    const createResult = await dbOrTransaction.collection('bill').add({
      data: {
        ...dataToSave,
        account: accountId,
        _openid: OPENID,
        createdAt: Date.now(),
        createdBy: OPENID,
        updatedAt: Date.now(),
        updatedBy: OPENID,
      },
    })
    if (!createResult._id) throw new Error('创建新账单失败')
    savedBillId = createResult._id
  }

  if (categoryId) {
    await dbOrTransaction
      .collection('category')
      .doc(categoryId)
      .update({ data: { usedAt: Date.now() } })
  }

  const now = Date.now()
  if (!originalBill.createdAt) {
    originalBill.createdAt = now
  }
  return { ...originalBill, _id: savedBillId }
}

/**
 * 保存转账账单（双向）
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 * @param {object} [transaction] - 可选的数据库事务实例
 */
async function saveTransfer(event, models, dbOrTransaction) {
  const { bill } = event.body
  const { accountId: currentAccountId } = event.query || {}
  const { category, amount, datetime, note } = bill
  const { getAccount } = require('./account.js')

  const targetAccountInfo = bill.category?.account
  if (!targetAccountInfo || !targetAccountInfo._id) {
    throw new Error('转账失败：目标账户信息不完整')
  }
  const targetAccountId = targetAccountInfo._id
  if (targetAccountId === currentAccountId) {
    throw new Error('转账失败：转出账户和转入账户不能相同')
  }

  const isTransferOut = category.name === '转账'

  const sourceAccountId = isTransferOut ? currentAccountId : targetAccountId
  const destinationAccountId = isTransferOut ? targetAccountId : currentAccountId

  const main = async (tx) => {
    const [sourceAccount, destinationAccount, transferOutCategoryRes, transferInCategoryRes] =
      await Promise.all([
        getAccount({ query: { accountId: sourceAccountId } }, models, tx),
        getAccount({ query: { accountId: destinationAccountId } }, models, tx),
        db
          .collection('category')
          .where({ name: '转账', _openid: _.exists(false) })
          .get(),
        db
          .collection('category')
          .where({ name: '收转账', _openid: _.exists(false) })
          .get(),
      ])

    if (!sourceAccount) throw new Error('转账失败：找不到源账户')
    if (!destinationAccount) throw new Error('转账失败：找不到目标账户')

    const transferAmount = Math.abs(parseMoney(amount))
    if (sourceAccount.balance < transferAmount) {
      throw new BizError('账户余额不足，无法转账')
    }

    if (!transferOutCategoryRes.data || transferOutCategoryRes.data.length === 0)
      throw new Error('转账失败：找不到内置分类“转账”')
    if (!transferInCategoryRes.data || transferInCategoryRes.data.length === 0)
      throw new Error('转账失败：找不到内置分类“收转账”')

    const transferOutCat = transferOutCategoryRes.data[0]
    const transferInCat = transferInCategoryRes.data[0]

    const billOut = {
      ...bill,
      amount: -transferAmount,
      category: transferOutCat,
      account: sourceAccountId,
      note: isTransferOut ? note : `向 ${destinationAccount.title} 转账`,
    }

    const billIn = {
      ...bill,
      _id: undefined,
      amount: transferAmount,
      category: transferInCat,
      account: destinationAccountId,
      note: isTransferOut ? `从 ${sourceAccount.title} 转入` : note,
      tags: [],
    }

    const savedBillOut = await saveBill(billOut, sourceAccountId, models, tx)
    const savedBillIn = await saveBill(billIn, destinationAccountId, models, tx)

    await tx
      .collection('bill')
      .doc(savedBillOut._id)
      .update({ data: { relatedBill: savedBillIn._id } })
    await tx
      .collection('bill')
      .doc(savedBillIn._id)
      .update({ data: { relatedBill: savedBillOut._id } })

    const primaryBill = isTransferOut ? savedBillOut : savedBillIn
    const secondaryBill = isTransferOut ? savedBillIn : savedBillOut

    return { ...primaryBill, relatedBill: secondaryBill._id }
  }

  if (dbOrTransaction) {
    return main(dbOrTransaction)
  } else {
    const tx = await db.startTransaction()
    try {
      const result = await main(tx)
      await tx.commit()
      return result
    } catch (e) {
      await tx.rollback()
      if (e.isBiz) {
        throw e
      }
      throw new Error(`转账失败: ${e.message}`)
    }
  }
}

async function populateCategoriesForBills(bills, models) {
  if (!bills || bills.length === 0) {
    return []
  }

  const categoryIds = [...new Set(bills.map((b) => b.category).filter(Boolean))]

  if (categoryIds.length === 0) {
    return bills
  }

  const { getCategoriesByIds } = require('./category.js')
  const categories = await getCategoriesByIds({ query: { ids: categoryIds } }, models)

  const categoryMap = new Map(categories.map((c) => [c._id, c]))

  return bills.map((bill) => {
    return {
      ...bill,
      category: categoryMap.get(bill.category) || null,
    }
  })
}

async function deleteBills(event, models, dbOrTransaction) {
  const { ids, accountId } = event.query
  const { isDeactivating } = event
  const { OPENID } = cloud.getWXContext()

  const initialBillsRes = await dbOrTransaction
    .collection('bill')
    .where({
      _id: _.in(ids),
      account: _.eq(accountId),
      _openid: _.eq(OPENID),
    })
    .get()
  const initialBills = initialBillsRes.data || []

  const relatedBillIds = initialBills.map((b) => b.relatedBill).filter(Boolean)

  const finalBillIds = Array.from(new Set([...ids, ...relatedBillIds]))

  if (finalBillIds.length === 0) {
    return { deleted: 0 }
  }

  const billsRes = await dbOrTransaction
    .collection('bill')
    .where({
      _id: _.in(finalBillIds),
      _openid: _.eq(OPENID),
    })
    .get()
  const finalBillsToDelete = billsRes.data

  const accountChanges = finalBillsToDelete.reduce((acc, bill) => {
    const { account, amount } = bill
    if (!acc[account]) {
      acc[account] = { balanceIncrement: 0, incomeIncrement: 0, expenseIncrement: 0 }
    }
    acc[account].balanceIncrement -= amount
    if (amount > 0) {
      acc[account].incomeIncrement -= amount
    } else {
      acc[account].expenseIncrement -= amount
    }
    return acc
  }, {})

  for (const id of Object.keys(accountChanges)) {
    const changes = accountChanges[id]
    if (isDeactivating && id === accountId) {
      continue
    }
    await updateAccount(
      {
        query: { accountId: id },
        body: {
          balanceIncrement: parseMoney(changes.balanceIncrement),
          incomeIncrement: parseMoney(changes.incomeIncrement),
          expenseIncrement: parseMoney(changes.expenseIncrement),
        },
      },
      models,
      dbOrTransaction,
    )
  }

  const deleteResult = await dbOrTransaction
    .collection('bill')
    .where({
      _id: _.in(finalBillIds),
      _openid: _.eq(OPENID),
    })
    .remove()

  return { deleted: deleteResult.stats.removed }
}

async function deactivateAccount(event, models, dbOrTransaction) {
  const { accountId } = event.query
  const { OPENID } = cloud.getWXContext()

  const accountRes = await dbOrTransaction.collection('account').doc(accountId).get()
  if (!accountRes.data || accountRes.data._openid !== OPENID) {
    throw new BizError(`找不到 ID 为 ${accountId} 的账本，或没有权限删除。`)
  }

  const billsInAccountRes = await dbOrTransaction
    .collection('bill')
    .where({
      account: _.eq(accountId),
      _openid: _.eq(OPENID),
    })
    .get()
  const billIdsInAccount = (billsInAccountRes.data || []).map((b) => b._id)

  const relatedBillsRes = await dbOrTransaction
    .collection('bill')
    .where({
      relatedBill: _.in(billIdsInAccount),
      _openid: _.eq(OPENID),
    })
    .get()
  const relatedBills = relatedBillsRes.data || []

  if (relatedBills.length > 0) {
    const batchSize = 3
    for (let i = 0; i < relatedBills.length; i += batchSize) {
      const batch = relatedBills.slice(i, i + batchSize)
      const updatePromises = batch.map((bill) => {
        return dbOrTransaction
          .collection('bill')
          .doc(bill._id)
          .update({
            data: {
              deletedRelatedBill: bill.relatedBill,
              relatedBill: _.remove(),
            },
          })
      })
      await Promise.all(updatePromises)
    }
  }

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

  await dbOrTransaction.collection('account').doc(accountId).remove()

  return {
    success: true,
    message: '账本及其所有账单已删除，关联转账记录已处理',
    deletedBills: deletedCount,
  }
}

async function getCategoryByNames(event, models, dbOrTransaction) {
  const { categories: categoriesInfo } = event.query || {}
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!categoriesInfo || categoriesInfo.length === 0) {
    return []
  }

  const finalCategories = []
  const categoryMap = new Map()

  const orConditions = categoriesInfo.map((info) => ({ name: info.name, type: info.type }))
  const { data: privateCategories } = await dbInstance
    .collection('category')
    .where({
      _openid: OPENID,
      $or: orConditions,
    })
    .get()

  for (const cat of privateCategories) {
    const key = `${cat.name}-${cat.type}`
    if (!categoryMap.has(key)) {
      finalCategories.push(cat)
      categoryMap.set(key, cat)
    }
  }

  const remainingInfos = categoriesInfo.filter(
    (info) => !categoryMap.has(`${info.name}-${info.type}`),
  )
  if (remainingInfos.length > 0) {
    const publicOrConditions = remainingInfos.map((info) => ({ name: info.name, type: info.type }))
    const { data: publicCategories } = await dbInstance
      .collection('category')
      .where({
        _openid: _.exists(false),
        $or: publicOrConditions,
      })
      .get()

    for (const cat of publicCategories) {
      const key = `${cat.name}-${cat.type}`
      if (!categoryMap.has(key)) {
        finalCategories.push(cat)
        categoryMap.set(key, cat)
      }
    }
  }

  const categoriesToCreate = categoriesInfo.filter(
    (info) => !categoryMap.has(`${info.name}-${info.type}`),
  )
  if (categoriesToCreate.length > 0) {
    const newCategoriesData = categoriesToCreate.map((info) => ({
      name: info.name,
      type: info.type,
      _openid: OPENID,
      createdAt: Date.now(),
      usedAt: Date.now(),
    }))

    const createResult = await dbInstance.collection('category').add({
      data: newCategoriesData,
    })

    const { data: newCreatedCategories } = await dbInstance
      .collection('category')
      .where({
        _id: _.in(createResult._ids),
      })
      .get()

    finalCategories.push(...newCreatedCategories)
  }

  return finalCategories
}

async function getTagsByNames(event, models, dbOrTransaction) {
  const { names } = event.query || {}
  const { OPENID } = cloud.getWXContext()
  const dbInstance = dbOrTransaction || db

  if (!names || names.length === 0) {
    return []
  }

  const { data: existingData } = await dbInstance
    .collection('tag')
    .where({
      name: _.in(names),
      _openid: { $eq: OPENID },
    })
    .get()

  const existingTags = existingData || []
  const existingTagMap = new Map(existingTags.map((t) => [t.name, t]))

  const tagsToCreate = names.filter((name) => !existingTagMap.has(name))

  if (tagsToCreate.length > 0) {
    const newTagsData = tagsToCreate.map((name) => ({
      name,
      _openid: OPENID,
    }))

    await dbInstance.collection('tag').add({
      data: newTagsData,
    })

    const { data: allData } = await dbInstance
      .collection('tag')
      .where({
        name: _.in(names),
        _openid: { $eq: OPENID },
      })
      .get()
    return allData || []
  }

  return existingTags
}

/**
 * 核心批量保存账单逻辑（内部函数）。
 * @param {Array<object>} bills - 准备存入数据库的账单对象数组
 * @param {string} accountId - 账户 ID
 * @param {object} models - 数据模型实例
 * @param {object} dbOrTransaction - 数据库事务实例
 * @returns {Array<object>} - 保存后的账单对象数组
 */
async function saveBills(bills, accountId, models, dbOrTransaction) {
  if (!Array.isArray(bills) || bills.length === 0) {
    throw new Error('请求中缺少 bills 数组')
  }

  const savedBills = []

  for (const bill of bills) {
    if (!bill.category) {
      throw new Error('批量保存的账单中存在缺少 category 的项')
    }
    const isTransfer = bill.category.name === '转账' || bill.category.name === '收转账'
    let savedBill
    if (isTransfer) {
      const transferEvent = { body: { bill }, query: { accountId } }
      savedBill = await saveTransfer(transferEvent, models, dbOrTransaction)
    } else {
      savedBill = await saveBill(bill, accountId, models, dbOrTransaction)
    }
    savedBills.push(savedBill)
  }
  return savedBills
}

module.exports = {
  saveBill,
  saveBills,
  updateAccount,
  parseMoney,
  populateTagsForBills,
  populateCategoriesForBills,
  saveTransfer,
  deleteBills,
  deactivateAccount,
  getCategoryByNames,
  getTagsByNames,
  tryParseJSON,
  tryStringifyJSON,
  BizError,
}
