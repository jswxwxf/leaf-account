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
    await db.collection('tag').where({ _id: _.exists(true) }).remove()
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
    const incomeCategoryNames = ['人情', '商家转账', '工资', '理财']
    const categoriesToCreate = categoryNames.map((name) => ({
      name,
      type: incomeCategoryNames.includes(name) ? '20' : '10', // '20' income, '10' expense
    }))

    const tagNames = [...new Set(bills.flatMap((b) => b.tags || []))].filter(Boolean)
    const tagsToCreate = tagNames.map((name) => ({ name, type: '10' })) // 默认为支出

    if (categoriesToCreate.length > 0) {
      await models.category.createMany({ data: categoriesToCreate })
      console.log(`成功创建 ${categoriesToCreate.length} 个分类。`)
    }
    if (tagsToCreate.length > 0) {
      await models.tag.createMany({ data: tagsToCreate })
      console.log(`成功创建 ${tagsToCreate.length} 个标签。`)
    }

    // 3. 获取刚创建的 Categories 和 Tags 的 ID，并建立映射
    const createdCategories = await models.category.list({
      filter: { where: { name: { $in: categoryNames } } },
    })
    const categoryMap = createdCategories.data.records.reduce((acc, cur) => {
      acc[cur.name] = cur._id
      return acc
    }, {})

    const createdTags = await models.tag.list({
      filter: { where: { name: { $in: tagNames } } },
    })
    const tagMap = createdTags.data.records.reduce((acc, cur) => {
      acc[cur.name] = cur._id
      return acc
    }, {})

    // 4. 重构并批量导入 Bills
    const billsToSave = bills.map((bill) => {
      // 核心字段
      const newBill = {
        amount: Number(bill.amount) || 0,
        datetime: new Date(`${bill.date} ${bill.time}`).getTime(),
        note: bill.note || '',
      }

      // 关联 Category
      if (bill.category && categoryMap[bill.category]) {
        newBill.category = cloud.database().collection('category').doc(categoryMap[bill.category])
      }

      // 关联 Tags
      if (bill.tags && bill.tags.length > 0) {
        newBill.tags = bill.tags
          .map((tagName) => tagMap[tagName])
          .filter(Boolean)
          .map((tagId) => cloud.database().collection('tag').doc(tagId))
      } else {
        newBill.tags = []
      }

      return newBill
    })

    await models.bill.createMany({ data: billsToSave })
    console.log(`成功导入 ${bills.length} 条账单。`)

    return {
      success: true,
      message: `数据导入成功！导入了 ${bills.length} 条账单, ${categories.length} 个分类, ${tags.length} 个标签。`,
    }
  } catch (error) {
    console.error('数据导入失败:', error)
    return { success: false, message: '数据导入失败', error: error.message }
  }
}
