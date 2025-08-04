import { ref, computed, onShow, watch } from '@vue-mini/core'
import { sumBy, orderBy } from 'lodash'
import { DateTime } from 'luxon'
import { getBillsByMonth } from '@/api/bill.js'
import { groupBillsByDate } from '@/service/bill-service.js'

export default function store() {
  // 原始账单列表
  const rawBills = ref([])
  // 分页状态
  const hasMore = ref(true)
  const nextStartDate = ref(null)
  const loading = ref(false)

  // 按天分组的账单
  const dailyBills = computed(() => groupBillsByDate(rawBills.value))

  // 筛选器值
  const typeValue = ref(0)
  const dateValue = ref(DateTime.now().endOf('month').toFormat('yyyy-MM-dd'))

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
      const res = await getBillsByMonth(query)

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

      nextStartDate.value = res.nextStartDate
      hasMore.value = !!res.nextStartDate
    } finally {
      loading.value = false
    }
  }

  // 加载更多
  async function loadMore() {
    if (!hasMore.value || loading.value) return
    const query = { startDate: nextStartDate.value }
    await fetchBills(query, true)
  }

  // 重置并获取数据
  async function resetAndFetchBills(query = {}) {
    hasMore.value = true
    nextStartDate.value = null
    await fetchBills(query, false)
  }

  // 监听筛选条件变化，自动重新获取数据
  watch(dateValue, (newDate) => {
    resetAndFetchBills({ startDate: newDate })
  })

  // 初始化时获取数据
  resetAndFetchBills({ startDate: dateValue.value })

  // 页面显示时刷新数据
  onShow(() => {
    resetAndFetchBills({ startDate: dateValue.value })
  })

  function updateBills(bills) {
    let hasNewBills = false
    bills.forEach((newBill) => {
      const index = rawBills.value.findIndex((b) => b._id === newBill._id)
      if (index > -1) {
        // 更新
        rawBills.value.splice(index, 1, newBill)
      } else {
        // 新增
        rawBills.value.push(newBill)
        hasNewBills = true
      }
    })
    // 如果有新增账单，则进行排序
    if (hasNewBills) {
      rawBills.value = orderBy(rawBills.value, ['datetime'], ['desc'])
    }
  }

  function removeBills(bills) {
    const idsToRemove = new Set(bills.map(b => b._id))
    rawBills.value = rawBills.value.filter(b => !idsToRemove.has(b._id))
  }

  return {
    updateBills,
    removeBills,
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
