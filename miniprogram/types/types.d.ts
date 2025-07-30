/**
 * @file 数据模型类型定义
 */

/**
 * 分类
 */
export interface Category {
  _id: string
  name: string
  createdAt: number
  updatedAt: number
}

/**
 * 标签
 */
export interface Tag {
  _id: string
  name: string
  createdAt: number
  updatedAt: number
}

/**
 * 账单
 */
export interface Bill {
  _id: string
  note?: string
  amount: number
  tags?: string[]
  datetime: number
  category_id?: Category | string
  createdAt: number
  updatedAt: number
}
