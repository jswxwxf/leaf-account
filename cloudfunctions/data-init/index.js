const cloud = require('@cloudbase/node-sdk')

// 从 JSON 文件读取分类数据
const { expense: expenseCategories, income: incomeCategories } = require('./category-data.json')

const app = cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})
const db = app.database()
const _ = db.command

/**
 * 初始化系统分类（增量更新）
 */
async function initCategory() {
  const collection = db.collection('category')
  const allCategoriesFromFile = [...expenseCategories, ...incomeCategories]
  const allCategoryNames = allCategoriesFromFile.map((c) => c.name)

  // 1. 查找所有已存在的系统分类
  const { data: existingCategories } = await collection
    .where({
      name: _.in(allCategoryNames),
    })
    .get()

  const existingCategoryNames = new Set(existingCategories.map((c) => c.name))
  console.log(`数据库中已存在 ${existingCategoryNames.size} 个相关的系统分类。`)

  // 2. 筛选出需要新增的分类
  const categoriesToCreate = allCategoriesFromFile.filter((c) => !existingCategoryNames.has(c.name))

  if (categoriesToCreate.length === 0) {
    console.log('无需创建新的系统分类。')
    return {
      found: existingCategories.length,
      created: 0,
    }
  }

  // 3. 批量插入新的系统分类数据
  const categoriesWithMeta = categoriesToCreate.map((c) => ({
    ...c,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'administrator',
    updatedBy: 'administrator',
  }))

  const addResult = await collection.add(categoriesWithMeta)
  console.log(`成功插入 ${addResult.inserted} 条新的系统分类。`)

  return {
    found: existingCategories.length,
    created: addResult.inserted,
  }
}

/**
 * 初始化账本
 */
async function initAccount() {
  const collection = db.collection('account')
  const accountsToCreate = [
    { title: '枫叶帐本', name: 'leaf-maple', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '银杏帐本', name: 'leaf-ginkgo', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '莲叶帐本', name: 'leaf-lotus', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '芭蕉帐本', name: 'leaf-banana', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '桑叶帐本', name: 'leaf-mulberry', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '松叶帐本', name: 'leaf-pine', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '芦苇帐本', name: 'leaf-reed', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '柳叶帐本', name: 'leaf-willow', totalIncome: 0, totalExpense: 0, balance: 0 },
    { title: '梧桐帐本', name: 'leaf-phoenix', totalIncome: 0, totalExpense: 0, balance: 0 },
  ]

  // 1. 查找所有已存在的账本
  const { data: existingAccounts } = await collection
    .where({
      name: _.in(accountsToCreate.map((a) => a.name)),
      _openid: '',
    })
    .get()

  const existingAccountNames = new Set(existingAccounts.map((a) => a.name))
  console.log(`数据库中已存在 ${existingAccountNames.size} 个相关的账本。`)

  // 2. 筛选出需要新增的账本
  const accountsToCreateFiltered = accountsToCreate.filter((a) => !existingAccountNames.has(a.name))

  if (accountsToCreateFiltered.length === 0) {
    console.log('无需创建新的账本。')
    return {
      found: existingAccounts.length,
      created: 0,
    }
  }

  // 3. 批量插入新的账本数据
  const accountsWithMeta = accountsToCreateFiltered.map((a) => ({
    ...a,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: 'administrator',
    updatedBy: 'administrator',
  }))

  const addResult = await collection.add(accountsWithMeta)
  console.log(`成功插入 ${addResult.inserted} 条新的账本。`)

  return {
    found: existingAccounts.length,
    created: addResult.inserted,
  }
}

/**
 * 云函数入口
 * @param {object} event - 包含任务类型等信息的对象
 * @param {string} event.task - 要执行的任务名称，例如 "init-category"
 */
exports.main = async (event) => {
  const { task } = event

  console.log(`开始执行初始化任务: ${task}`)

  switch (task) {
    case 'init-category':
      return await initCategory()
    case 'init-account':
      return await initAccount()
    // 在这里可以添加更多的 case 来处理其他初始化任务
    // case 'initTags':
    //   return await initTags()

    default:
      const errorMessage = `未知的初始化任务: ${task}`
      console.error(errorMessage)
      return {
        success: false,
        message: errorMessage,
      }
  }
}
