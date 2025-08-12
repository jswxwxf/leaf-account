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
  const allCategoryNames = allCategoriesFromFile.map(c => c.name)

  // 1. 查找所有已存在的系统分类
  const { data: existingCategories } = await collection.where({
    name: _.in(allCategoryNames),
  }).get()

  const existingCategoryNames = new Set(existingCategories.map(c => c.name))
  console.log(`数据库中已存在 ${existingCategoryNames.size} 个相关的系统分类。`)

  // 2. 筛选出需要新增的分类
  const categoriesToCreate = allCategoriesFromFile.filter(
    c => !existingCategoryNames.has(c.name)
  )

  if (categoriesToCreate.length === 0) {
    console.log('无需创建新的系统分类。')
    return {
      found: existingCategories.length,
      created: 0,
    }
  }

  // 3. 批量插入新的系统分类数据
  const categoriesWithMeta = categoriesToCreate.map(c => ({
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
