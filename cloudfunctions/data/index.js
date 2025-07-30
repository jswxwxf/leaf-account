const cloud = require('wx-server-sdk')
const TcbRouter = require('tcb-router')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

/**
 * 创建一个通用的 CRUD 处理器
 * @param {string} collectionName - 数据库集合名称
 * @returns {Function} - TcbRouter 中间件
 */
const createCrudHandlers = (collectionName, event) => {
  return async (ctx, next) => {
    const { action, data, id, query } = event
    const collection = db.collection(collectionName)

    try {
      switch (action) {
        case 'add':
          ctx.body = await collection.add({ data: { ...data, createdAt: new Date(), updatedAt: new Date() } })
          break
        case 'get':
          if (id) {
            ctx.body = await collection.doc(id).get()
          } else {
            // 支持更灵活的查询、分页和排序
            const { page, limit, orderBy, order, ...restQuery } = query || {}
            let dbQuery = collection.where(restQuery)

            // 仅在指定时排序
            if (orderBy) {
              dbQuery = dbQuery.orderBy(orderBy, order || 'desc')
            }

            // 仅在指定时分页
            if (limit) {
              const skip = ((page || 1) - 1) * limit
              dbQuery = dbQuery.skip(skip).limit(parseInt(limit, 10))
            }

            ctx.body = await dbQuery.get()
          }
          break
        case 'update':
          if (!id) throw new Error('更新操作需要提供 id')
          ctx.body = await collection.doc(id).update({ data: { ...data, updatedAt: new Date() } })
          break
        case 'delete':
          if (!id) throw new Error('删除操作需要提供 id')
          ctx.body = await collection.doc(id).remove()
          break
        default:
          ctx.body = { code: 400, message: '无效的操作类型' }
      }
    } catch (e) {
      ctx.body = { code: 500, message: e.message, error: e }
    }
    await next()
  }
}

exports.main = (event, context) => {
  const app = new TcbRouter({ event })

  // 为每个数据模型注册 CRUD 路由
  app.router('/bill', createCrudHandlers('bill', event))
  app.router('/category', createCrudHandlers('category', event))
  app.router('/tag', createCrudHandlers('tag', event))

  return app.serve()
}
