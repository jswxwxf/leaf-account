import { ref, computed, onShow } from '@vue-mini/core'
import { sumBy, orderBy } from 'lodash'
import { DateTime } from '@/utils/date.js'
import { getBillsByDate } from '@/api/bill.js'
import { groupBillsByDate } from '@/service/bill-service.js'

export default function store() {
  // 原始账单列表
  const rawBills = ref([])
  // 分页状态
  const page = ref(1)
  const pageSize = 20
  const hasMore = ref(true)
  const loading = ref(false)

  // 按天分组的账单
  const dailyBills = computed(() => groupBillsByDate(rawBills.value))

  // 筛选器值
  const typeValue = ref(0)
  const dateValue = ref(0) // TODO: 后续用于月份筛选

  // 总计
  const totalExpense = computed(() => {
    const total = sumBy(rawBills.value, (bill) => (bill.amount < 0 ? Math.abs(bill.amount) : 0))
    return (total || 0).toFixed(2)
  })

  const totalIncome = computed(() => {
    const total = sumBy(rawBills.value, (bill) => (bill.amount > 0 ? bill.amount : 0))
    return (total || 0).toFixed(2)
  })

  // 获取账单数据
  async function fetchBills(query = {}, isLoadMore = false) {
    if (loading.value) return
    loading.value = true

    try {
      const res = await getBillsByDate(query)

      // 如果请求失败，res 为 null，或 res.data 不是数组，则中止后续操作
      if (!res || !Array.isArray(res.data)) {
        hasMore.value = false
        return
      }

      if (isLoadMore) {
        rawBills.value.push(...res.data)
      } else {
        rawBills.value = res.data
      }

      hasMore.value = rawBills.value.length < res.items
    } finally {
      loading.value = false
    }
  }

  // 加载更多
  async function loadMore() {
    if (!hasMore.value || loading.value) return
    page.value++
    await fetchBills(undefined, true)
  }

  // 重置并获取数据
  async function resetAndFetchBills(query = {}) {
    page.value = 1
    hasMore.value = true
    await fetchBills(query, false)
  }

  // 初始化时获取数据
  resetAndFetchBills()

  // 页面显示时刷新数据
  onShow(() => {
    resetAndFetchBills()
  })

  function updateRawBill(newBill) {
    const index = rawBills.value.findIndex((b) => b._id === newBill._id)
    if (index > -1) {
      // 更新
      rawBills.value.splice(index, 1, newBill)
    } else {
      // 新增
      rawBills.value.push(newBill)
      // 重新排序
      rawBills.value = orderBy(rawBills.value, ['datetime'], ['desc'])
    }
  }

  function removeRawBill(billId) {
    const index = rawBills.value.findIndex((b) => b._id === billId)
    if (index > -1) {
      rawBills.value.splice(index, 1)
    }
  }

  return {
    updateRawBill,
    removeRawBill,
    dailyBills,
    typeValue,
    dateValue,
    totalExpense,
    totalIncome,
    loading,
    hasMore,
    loadMore,
  }
}

export const storeKey = Symbol('account-store')
