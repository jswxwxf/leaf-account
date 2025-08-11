const cloud = require('wx-server-sdk')
const { init } = require('@cloudbase/wx-cloud-client-sdk')
const fs = require('fs')
const path = require('path')

// 在指定环境中初始化
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const client = init(cloud)
const models = client.models

exports.main = async (event, context) => {
  try {
    const db = cloud.database()
    const _ = db.command

    // 0. 清空旧数据
    console.log('正在清空旧数据...')
    await db.collection('bill').where({ _id: _.exists(true) }).remove()
    await db.collection('category').where({ _id: _.exists(true) }).remove()
    await db.collection('account').where({ _id: _.exists(true) }).remove()
    console.log('旧数据清空完毕。')

    // 1. 读取 db.json 文件
    const dbPath = path.resolve(__dirname, './db.json')
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    const bills = dbData.bills

    if (!bills || bills.length === 0) {
      return { success: true, message: '没有需要导入的账单数据' }
    }

    // 2. 准备并创建 Categories 和 Tags
    const categoryNames = [...new Set(bills.map((b) => b.category))].filter(Boolean)
    const categoryDataPath = path.resolve(__dirname, '../data-init/category-data.json')
    const categoryData = JSON.parse(fs.readFileSync(categoryDataPath, 'utf-8'))
    const incomeCategoryNames = categoryData.income.map(c => c.name)
    const categoriesToCreate = categoryNames.map((name) => ({
      name,
      type: incomeCategoryNames.includes(name) ? '10' : '20', // '10' income, '20' expense
      _openid: null,
    }))

    if (categoriesToCreate.length > 0) {
      await models.category.createMany({ data: categoriesToCreate })
      console.log(`成功创建 ${categoriesToCreate.length} 个分类。`)
    }

    // 3. 获取刚创建的 Categories 和 Tags 的 ID，并建立映射
    const createdCategories = await models.category.list({
      filter: { where: { name: { $in: categoryNames } } },
    })
    const categoryMap = createdCategories.data.records.reduce((acc, cur) => {
      acc[cur.name] = cur._id
      return acc
    }, {})


    // 4. 重构并批量导入 Bills
    const billsToSave = bills.map((bill) => {
      // 核心字段
      const newBill = {
        amount: incomeCategoryNames.includes(bill.category) ? Math.abs(Number(bill.amount) || 0) : -Math.abs(Number(bill.amount) || 0),
        datetime: new Date(`${bill.date} ${bill.time}`).getTime(),
        note: bill.note || '',
        _openid: null,
      }

      // 关联 Category
      if (bill.category && categoryMap[bill.category]) {
        newBill.category = cloud.database().collection('category').doc(categoryMap[bill.category])
      }


      return newBill
    })

    await models.bill.createMany({ data: billsToSave })
    console.log(`成功导入 ${bills.length} 条账单。`)

    return {
      success: true,
      message: `数据导入成功！导入了 ${bills.length} 条账单, ${categoriesToCreate.length} 个分类。`,
    }
  } catch (error) {
    console.error('数据导入失败:', error)
    return { success: false, message: '数据导入失败', error: error.message }
  }
}
