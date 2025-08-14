const cloud = require('wx-server-sdk')
const { saveBill } = require('./bill.js')
const { BizError } = require('./common.js')

const db = cloud.database()
const _ = db.command

/**
 * 获取当前用户的账户信息。
 * @param {object} event - 云函数的原始 event 对象
 * @param {object} models - 数据模型实例
 * @param {object} [options] - 其他选项
 * @param {boolean} [options.withId=false] - 是否返回 _id 字段
 */
async function getAccount(event, models) {
  const { name = 'leaf-maple', accountId } = event.query || {}
  const { OPENID } = cloud.getWXContext()

  // 如果传入 accountId，则优先使用 ID 查询
  if (accountId) {
    const accountRes = await models.account.get({
      filter: {
        where: {
          _id: { $eq: accountId },
          _openid: { $eq: OPENID }, // 确保只能获取自己的
        },
      },
    })
    if (accountRes.data) {
      const account = accountRes.data
      delete account._openid
      return account
    }
    // 如果按 ID 找不到，抛出错误
    throw new BizError(`找不到 ID 为 ${accountId} 的账本，或没有权限访问。`)
  }

  // 1. 尝试查找用户自己的账本
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

  // 2. 如果找不到，尝试查找公共账本
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

  // 3. 如果找到公共账本，为用户复制一份
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
    delete newAccountData._id // 删除旧的 _id 以创建新记录

    const createRes = await models.account.create({
      data: newAccountData,
    })

    // 返回新创建的账本
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

  // 4. 如果都找不到，抛出错误
  throw new BizError(`名为 "${name}" 的账本不存在，请检查账本名称或联系管理员。`)
}

async function reconcileAccount(event, models) {
  const { actualBalance, accountId } = event
  const { OPENID } = cloud.getWXContext()

  if (typeof actualBalance !== 'number') {
    throw new Error('缺少有效的 actualBalance 参数')
  }

  // 1. 获取当前系统余额
  const currentAccount = await getAccount(
    { ...event, query: { ...event.query, accountId } },
    models,
  )
  const systemBalance = currentAccount.balance
  const difference = actualBalance - systemBalance

  // 如果没有差额，则无需操作
  if (Math.abs(difference) < 0.01) {
    return currentAccount
  }

  // 2. 确定调账类型和分类
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
        _openid: { $empty: true }, // 只使用内置的分类
      },
    },
    page: 1,
    pageSize: 1,
  })

  if (!categories || categories.length === 0) {
    throw new Error(`找不到内置分类: ${categoryName}`)
  }
  const category = categories[0]

  // 3. 构建调账账单
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

  // 4. 创建一个新的 event 对象来调用 saveBill
  const saveBillEvent = {
    ...event, // 继承父 event 的上下文
    query: {
      accountId,
    },
    body: {
      bill: reconcileBill,
    },
  }

  // 5. 调用 saveBill 来创建账单并自动更新账户余额
  // saveBill 内部处理事务，无需在这里手动开启
  await saveBill(saveBillEvent, models)

  // 6. 返回更新后的账户信息
  // 此时账户信息已经被 saveBill 更新，所以重新获取一次
  return getAccount({ ...event, query: { ...event.query, accountId } }, models)
}

async function getAccounts(event, models) {
  const { OPENID } = cloud.getWXContext()

  // 1. 获取用户的所有私有账本
  const privateAccountsRes = await models.account.list({
    filter: {
      where: {
        _openid: { $eq: OPENID },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    pageSize: 100, // 假设用户账本不会超过 100 个
  })
  const privateAccounts = (privateAccountsRes.data.records || []).map((acc) => {
    delete acc._openid
    return { ...acc, isOpened: true }
  })

  // 2. 获取所有公共账本
  const publicAccountsRes = await models.account.list({
    filter: {
      where: {
        _openid: { $empty: true },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    pageSize: 100, // 假设公共账本不会超过 100 个
  })
  const publicAccounts = (publicAccountsRes.data.records || []).map((acc) => {
    delete acc._openid
    return { ...acc, isOpened: false }
  })

  // 3. 过滤掉用户已经拥有的公共账本
  const privateAccountNames = new Set(privateAccounts.map((a) => a.name))
  const availablePublicAccounts = publicAccounts.filter((pa) => !privateAccountNames.has(pa.name))

  // 4. 合并并返回
  return [...privateAccounts, ...availablePublicAccounts]
}

module.exports = {
  getAccount,
  getAccounts,
  reconcileAccount,
}
