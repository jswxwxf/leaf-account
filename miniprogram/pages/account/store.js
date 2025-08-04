import { ref, computed, onShow, watch } from '@vue-mini/core'
import { sumBy, orderBy } from 'lodash'
import { DateTime } from 'luxon'
import { getBillsSummary, getBills } from '@/api/bill.js'
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
  const typeValue = ref('')
  const monthValue = ref(DateTime.now().endOf('month').toFormat('yyyy-MM'))

  // 总计
  const totalExpense = ref(0)
  const totalIncome = ref(0)

  // 获取账单数据
  async function fetchBills(query = {}, isLoadMore = false) {
    loading.value = true

    try {
      const res = await getBills(query)

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

  async function fetchBillsSummary(query = {}) {
    try {
      const res = await getBillsSummary(query)
      if (res && res.data) {
        totalIncome.value = res.data.totalIncome || 0
        totalExpense.value = res.data.totalExpense || 0
      }
    } catch (e) {
      // 静默失败
      console.error('fetchBillsSummary error:', e)
    } finally {
      loading.value = false
    }
  }

  // 加载更多
  async function loadMore() {
    if (!hasMore.value || loading.value) return
    const query = {
      month: monthValue.value,
      type: typeValue.value,
      startDate: nextStartDate.value,
    }
    await fetchBills(query, true)
  }

  // 重置并获取数据
  async function resetAndFetchBills(query = {}) {
    hasMore.value = true
    nextStartDate.value = null
    await fetchBills(query, false)
  }

  // 刷新数据
  function loadData() {
    const query = {
      month: monthValue.value,
      type: typeValue.value,
    }
    // 当选择了“全部”时，日期选择器传来的值为 ''
    // 所以只有 month 不为空时才获取汇总信息
    if (query.month) {
      fetchBillsSummary(query)
    }
    resetAndFetchBills(query)
  }

  // 监听筛选条件变化，自动重新获取数据
  watch([monthValue, typeValue], () => {
    loadData()
  })

  // 初始化时获取数据
  loadData()

  // 页面显示时刷新数据
  onShow(() => {
    loadData()
  })

  function updateBills(bills) {
    let needsReSort = false

    bills.forEach((newBill) => {
      const billMonth = DateTime.fromMillis(newBill.datetime).toFormat('yyyy-MM')
      // 后端返回的 category.type 是数值型，这里需要统一
      const billType = newBill.category.type.toString()

      const isMonthMatch = !monthValue.value || monthValue.value === billMonth
      const isTypeMatch = !typeValue.value || typeValue.value === billType
      const isMatch = isMonthMatch && isTypeMatch

      const index = rawBills.value.findIndex((b) => b._id === newBill._id)

      if (index > -1) {
        // 账单已存在于列表中
        if (isMatch) {
          // 更新后仍然符合条件，直接替换
          rawBills.value.splice(index, 1, newBill)
        } else {
          // 更新后不再符合条件，从列表中移除
          rawBills.value.splice(index, 1)
        }
      } else if (isMatch) {
        // 账单是新增的，且符合当前筛选条件
        rawBills.value.push(newBill)
        needsReSort = true // 新增了账单，需要重新排序
      }
    })

    // 如果有新增操作，则对整个数组进行排序
    if (needsReSort) {
      rawBills.value = orderBy(rawBills.value, ['datetime'], ['desc'])
    }
  }

  function removeBills(bills) {
    const idsToRemove = new Set(bills.map((b) => b._id))
    rawBills.value = rawBills.value.filter((b) => !idsToRemove.has(b._id))
  }

  return {
    updateBills,
    removeBills,
    dailyBills,
    typeValue,
    monthValue,
    totalExpense,
    totalIncome,
    loading,
    hasMore,
    loadMore,
  }
}

export const storeKey = Symbol('account-store')
