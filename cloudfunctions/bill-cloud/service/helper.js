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

/**
 * 原子化地更新用户的账户汇总信息。
 * 如果账户不存在，则会自动创建。
 * @param {object} event - 包含增量信息的对象
 * @param {number} event.balanceIncrement - 余额的变动量
 * @param {number} event.incomeIncrement - 总收入的变动量
 * @param {number} event.expenseIncrement - 总支出的变动量
 * @param {object} models - 数据模型实例
 * @param {object} [dbOrTransaction] - 数据库或事务实例，如果未提供，则使用默认的 db 实例
 */
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

  // 构建查询条件
  const where = {
    _id: accountId,
    _openid: OPENID, // 确保用户只能更新自己的账户
  }

  // 1. 查询账户是否存在
  const { data: accounts } = await accountCollection.where(where).limit(1).get()

  if (!accounts || accounts.length === 0) {
    throw new Error(`找不到 ID 为 ${accountId} 的账户，或没有权限操作。`)
  }

  // 2. 更新账户
  const updateData = {}
  if (balanceIncrement) updateData.balance = _.inc(balanceIncrement)
  if (incomeIncrement) updateData.totalIncome = _.inc(incomeIncrement)
  if (expenseIncrement) updateData.totalExpense = _.inc(expenseIncrement)
  if (title) updateData.title = title

  if (Object.keys(updateData).length === 0) return accounts[0] // 如果没有要更新的，直接返回当前账户信息

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
    account.isOpened = true // 既然能更新，说明是用户自己的私有账本
    return account
  }
  throw new Error('更新用户账户失败')
}

/**
 * 将金额四舍五入到两位小数。
 * @param {number|string} amount - 金额
 * @returns {number} - 处理后的金额
 */
function parseMoney(amount) {
  const num = parseFloat(amount)
  if (isNaN(num)) {
    return 0
  }
  // 使用 toFixed(2) 来进行正确的四舍五入并得到一个字符串
  // 然后使用 Number() 将其转换回数字类型。
  // 这是处理货币和需要精确小数位数的场景下的标准做法。
  return Number(num.toFixed(2))
}

/**
 * 为账单列表手动填充 tags 数据
 * @param {Array<object>} bills - 账单对象数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<Array<object>>} - 填充了 tags 的账单对象数组
 */
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

/**
 * 核心保存账单逻辑（内部函数，需在事务中调用）。
 * @param {object} billToSave - 准备存入数据库的账单对象
 * @param {string} accountId - 账户 ID
 * @param {object} models - 数据模型实例
 * @param {object} dbOrTransaction - 数据库事务实例
 * @returns {object} - 保存后的账单 ID
 */
async function saveBill(billToSave, accountId, models, dbOrTransaction) {
  const { OPENID } = cloud.getWXContext()
  const originalBill = { ...billToSave } // a copy for returning
  let savedBillId

  // 确保金额正负与类别匹配
  if (billToSave.category?.type === '10' && billToSave.amount < 0) {
    billToSave.amount = -billToSave.amount
  } else if (billToSave.category?.type === '20' && billToSave.amount > 0) {
    billToSave.amount = -billToSave.amount
  }

  // 从 bill.category 对象中提取 ID，用于存储
  const categoryId = billToSave.category?._id
  // 在 billToSave 对象上，将 category 字段的值设置为 ID 字符串
  billToSave.category = categoryId

  if (Array.isArray(billToSave.tags)) {
    billToSave.tags = billToSave.tags.map((tag) => tag._id).filter(Boolean)
  }

  if (billToSave._id) {
    // --- 更新逻辑 ---
    const billId = billToSave._id
    delete billToSave._id

    const oldBillRes = await dbOrTransaction.collection('bill').doc(billId).get()
    if (!oldBillRes.data) throw new Error(`找不到 ID 为 ${billId} 的账单`)
    const oldBill = oldBillRes.data

    if (oldBill._openid && oldBill._openid !== OPENID) {
      throw new Error(`没有权限修改账单 ${billId}`)
    }

    const balanceIncrement = parseMoney(billToSave.amount - oldBill.amount)
    const incomeIncrement = parseMoney(
      (billToSave.amount > 0 ? billToSave.amount : 0) - (oldBill.amount > 0 ? oldBill.amount : 0),
    )
    const expenseIncrement = parseMoney(
      (billToSave.amount < 0 ? billToSave.amount : 0) - (oldBill.amount < 0 ? oldBill.amount : 0),
    )

    await updateAccount(
      { query: { accountId }, body: { balanceIncrement, incomeIncrement, expenseIncrement } },
      models,
      dbOrTransaction,
    )
    await dbOrTransaction
      .collection('bill')
      .doc(billId)
      .update({ data: { ...billToSave, updatedAt: Date.now(), updatedBy: OPENID } })
    savedBillId = billId
  } else {
    // --- 新增逻辑 ---
    const balanceIncrement = billToSave.amount
    const incomeIncrement = balanceIncrement > 0 ? balanceIncrement : 0
    const expenseIncrement = balanceIncrement < 0 ? balanceIncrement : 0

    await updateAccount(
      { query: { accountId }, body: { balanceIncrement, incomeIncrement, expenseIncrement } },
      models,
      dbOrTransaction,
    )
    const createResult = await dbOrTransaction.collection('bill').add({
      data: {
        ...billToSave,
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

  // 从 category 中获取目标账户信息
  const targetAccountInfo = bill.category?.account
  if (!targetAccountInfo || !targetAccountInfo._id) {
    throw new Error('转账失败：目标账户信息不完整')
  }
  const targetAccountId = targetAccountInfo._id
  if (targetAccountId === currentAccountId) {
    throw new Error('转账失败：转出账户和转入账户不能相同')
  }

  const isTransferOut = category.name === '转账'

  // 确定源账户和目标账户
  const sourceAccountId = isTransferOut ? currentAccountId : targetAccountId
  const destinationAccountId = isTransferOut ? targetAccountId : currentAccountId

  const main = async (tx) => {
    // 1. 获取源账户和目标账户的信息
    // 注意：在事务中，所有读操作也需要使用事务实例
    const [sourceAccount, destinationAccount, transferOutCategory, transferInCategory] =
      await Promise.all([
        getAccount({ query: { accountId: sourceAccountId } }, models, tx),
        getAccount({ query: { accountId: destinationAccountId } }, models, tx),
        models.category.list(
          {
            filter: { where: { name: { $eq: '转账' }, _openid: { $empty: true } } },
          },
          tx,
        ),
        models.category.list(
          {
            filter: { where: { name: { $eq: '收转账' }, _openid: { $empty: true } } },
          },
          tx,
        ),
      ])

    if (!sourceAccount) throw new Error('转账失败：找不到源账户')
    if (!destinationAccount) throw new Error('转账失败：找不到目标账户')

    // 检查转出账户余额
    const transferAmount = Math.abs(parseMoney(amount))
    if (sourceAccount.balance < transferAmount) {
      throw new BizError('账户余额不足，无法转账')
    }

    if (!transferOutCategory.data || transferOutCategory.data.records.length === 0)
      throw new Error('转账失败：找不到内置分类“转账”')
    if (!transferInCategory.data || transferInCategory.data.records.length === 0)
      throw new Error('转账失败：找不到内置分类“收转账”')

    const transferOutCat = transferOutCategory.data.records[0]
    const transferInCat = transferInCategory.data.records[0]

    // 2. 构建转出和转入账单
    const billOut = {
      ...bill,
      amount: -transferAmount,
      category: transferOutCat,
      account: sourceAccountId,
      relatedAccount: destinationAccountId, // 保存对方账户信息
      note: isTransferOut ? note : `向 ${destinationAccount.title} 转账`,
    }

    const billIn = {
      ...bill,
      _id: undefined, // 确保是新建
      amount: transferAmount,
      category: transferInCat,
      account: destinationAccountId,
      relatedAccount: sourceAccountId, // 保存对方账户信息
      note: isTransferOut ? `从 ${sourceAccount.title} 转入` : note,
      tags: [], // 转入记录不带标签
    }

    // 3. 保存两笔账单
    const savedBillOut = await saveBill(billOut, sourceAccountId, models, tx)
    const savedBillIn = await saveBill(billIn, destinationAccountId, models, tx)

    // 4. 互相更新，保存对方的 ID
    await tx
      .collection('bill')
      .doc(savedBillOut._id)
      .update({ data: { relatedBill: savedBillIn._id } })
    await tx
      .collection('bill')
      .doc(savedBillIn._id)
      .update({ data: { relatedBill: savedBillOut._id } })

    // 5. 返回用户操作的原始账单，并附上关联ID
    const primaryBill = isTransferOut ? savedBillOut : savedBillIn
    const secondaryBill = isTransferOut ? savedBillIn : savedBillOut

    return { ...primaryBill, relatedBill: secondaryBill._id }
  }

  if (dbOrTransaction) {
    // 如果传入了事务，则在当前事务中执行
    return main(dbOrTransaction)
  } else {
    // 否则，开启新事务
    const tx = await db.startTransaction()
    try {
      const result = await main(tx)
      await tx.commit()
      return result
    } catch (e) {
      await tx.rollback()
      if (e.isBiz) {
        throw e // 如果是业务异常，直接抛出
      }
      throw new Error(`转账失败: ${e.message}`)
    }
  }
}

/**
 * 为账单列表填充完整的分类信息
 * @param {object[]} bills - 账单对象数组
 * @param {object} models - 数据模型实例
 * @returns {Promise<object[]>} - 填充了分类信息的账单数组
 */
async function populateCategoriesForBills(bills, models) {
  if (!bills || bills.length === 0) {
    return []
  }

  // 1. 提取所有不重复的 categoryId
  const categoryIds = [...new Set(bills.map(b => b.category).filter(Boolean))]

  if (categoryIds.length === 0) {
    return bills // 如果没有 categoryId，直接返回原数组
  }

  // 2. 批量查询 categoryId 对应的分类信息
  const { getCategoriesByIds } = require('./category.js')
  const categories = await getCategoriesByIds({ query: { ids: categoryIds } }, models)

  // 3. 创建一个 categoryId 到 category 对象的映射
  const categoryMap = new Map(categories.map(c => [c._id, c]))

  // 4. 将分类信息填充回账单对象
  return bills.map(bill => {
    return {
      ...bill,
      category: categoryMap.get(bill.category) || null,
    }
  })
}

/**
 * 核心批量删除账单逻辑（内部函数）。
 * @param {object} event - 包含 ids 和 accountId 的事件对象
 * @param {object} models - 数据模型实例
 * @param {object} dbOrTransaction - 数据库或事务实例
 * @returns {Promise<{deleted: number}>}
 */
async function deleteBills(event, models, dbOrTransaction) {
  const { ids, accountId } = event.query;
  const { OPENID } = cloud.getWXContext();

  // 1. 第一次查询：根据传入的id和accountId获取初始账单列表
  const initialBillsRes = await dbOrTransaction.collection('bill').where({
    _id: _.in(ids),
    account: _.eq(accountId),
    _openid: _.eq(OPENID)
  }).get();
  const initialBills = initialBillsRes.data || [];

  // 2. 收集所有关联账单的ID
  const relatedBillIds = initialBills.map(b => b.relatedBill).filter(Boolean);

  // 3. 合并初始ID和关联ID，得到最终需要处理的完整ID列表
  const finalBillIds = Array.from(new Set([...ids, ...relatedBillIds]));

  if (finalBillIds.length === 0) {
    return { deleted: 0 };
  }

  // 4. 第二次查询：获取所有最终要删除的账单的完整信息
  const billsRes = await dbOrTransaction.collection('bill').where({
    _id: _.in(finalBillIds),
    _openid: _.eq(OPENID) // 权限校验，确保只能删除自己的账单
  }).get();
  const finalBillsToDelete = billsRes.data;

  // 5. 按账户ID对账单进行分组，并计算每个账户的余额、收入、支出变化量
  const accountChanges = finalBillsToDelete.reduce((acc, bill) => {
    const { account, amount } = bill;
    if (!acc[account]) {
      acc[account] = { balanceIncrement: 0, incomeIncrement: 0, expenseIncrement: 0 };
    }
    acc[account].balanceIncrement -= amount;
    if (amount > 0) {
      acc[account].incomeIncrement -= amount;
    } else {
      acc[account].expenseIncrement -= amount;
    }
    return acc;
  }, {});

  // 6. 一次性更新所有受影响的账户
  const updatePromises = Object.keys(accountChanges).map(id => {
    const changes = accountChanges[id];
    return updateAccount(
      {
        query: { accountId: id },
        body: {
          balanceIncrement: parseMoney(changes.balanceIncrement),
          incomeIncrement: parseMoney(changes.incomeIncrement),
          expenseIncrement: parseMoney(changes.expenseIncrement),
        },
      },
      models,
      dbOrTransaction
    );
  });
  await Promise.all(updatePromises);

  // 7. 一次性删除所有相关账单
  const deleteResult = await dbOrTransaction.collection('bill').where({
    _id: _.in(finalBillIds),
    _openid: _.eq(OPENID)
  }).remove();

  return { deleted: deleteResult.stats.removed };
}

/**
 * 核心停用账本逻辑（内部函数）。
 * @param {object} event - 包含 accountId 的事件对象
 * @param {object} models - 数据模型实例
 * @param {object} dbOrTransaction - 数据库或事务实例
 */
async function deactivateAccount(event, models, dbOrTransaction) {
  const { accountId } = event.query
  const { OPENID } = cloud.getWXContext()

  // 1. 验证账本是否存在且属于当前用户
  const accountRes = await dbOrTransaction.collection('account').doc(accountId).get()
  if (!accountRes.data || accountRes.data._openid !== OPENID) {
    throw new BizError(`找不到 ID 为 ${accountId} 的账本，或没有权限删除。`)
  }

  // 2. 查找本账本的所有账单ID
  const billsInAccountRes = await dbOrTransaction.collection('bill').where({
    account: _.eq(accountId),
    _openid: _.eq(OPENID),
  }).get()
  const billIdsInAccount = (billsInAccountRes.data || []).map(b => b._id)

  let deletedCount = 0

  // 3. 调用 _deleteBills 一次性处理所有账单
  if (billIdsInAccount.length > 0) {
    const deleteResult = await _deleteBills(
      { query: { ids: billIdsInAccount, accountId: accountId } },
      models,
      dbOrTransaction
    )
    deletedCount = deleteResult.deleted
  }

  // 4. 删除账本自身
  await dbOrTransaction.collection('account').doc(accountId).remove()

  return {
    success: true,
    message: '账本及其所有关联账单已永久删除',
    deletedBills: deletedCount,
  }
}

module.exports = {
  saveBill,
  updateAccount,
  parseMoney,
  populateTagsForBills,
  populateCategoriesForBills, // 导出新函数
  saveTransfer,
  deleteBills,
  deactivateAccount,
  BizError,
}
