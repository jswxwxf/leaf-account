import { ref, computed, onShow, watch } from '@vue-mini/core'
import { sumBy, orderBy } from 'lodash'
import { getBills } from '@/api/bill.js'
import { getAccount } from '@/api/account.js'
import { groupBillsByDate } from '@/service/bill-service.js'
import { getCurrentMonth, formatDate } from '@/utils/date.js'

export const MAX_BATCH_BILLS = 20

export default function store() {
  // 原始账单列表
  const rawBills = ref([])
  // 分页状态
  const hasMore = ref(true)
  const nextStartDate = ref(null)
  const loading = ref(false)

  // 按天分组的账单
  const dailyBills = computed(() => groupBillsByDate(rawBills.value))

  // 当前账本信息
  const currentAccount = ref({})

  // 筛选器值
  const typeValue = ref('')
  const monthValue = ref('')

  // 总计
  const totalIncome = ref(0)
  const totalExpense = ref(0)
  const totalBalance = ref(0)

  // 错误状态
  const error = ref(null)

  // 前端搜索
  const searchText = ref('')

  function updateSearchText(e) {
    searchText.value = e.detail
  }

  const notes = computed(() => {
    const allNotes = rawBills.value.map((bill) => bill.note).filter(Boolean)
    return [...new Set(allNotes)]
  })

  function resetQuery() {
    typeValue.value = ''
    monthValue.value = getCurrentMonth()
  }

  resetQuery()

  // 获取账单数据
  async function fetchBills(query = {}, isLoadMore = false) {
    if (!currentAccount.value._id) return

    loading.value = true
    try {
      const res = await getBills({ ...query, accountId: currentAccount.value._id })

      // 如果请求失败，res 为 null，或 res.data 不是数组，则中止后续操作
      if (!res || !Array.isArray(res.data)) {
        hasMore.value = false
        return
      }

      updateAccountSummary(res)

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

  async function loadAccount() {
    const name = getApp().globalData.account.value.name
    error.value = null

    try {
      const { data: accountInfo } = await getAccount(name)
      currentAccount.value = accountInfo
      totalBalance.value = accountInfo.balance
      totalIncome.value = accountInfo.totalIncome
      totalExpense.value = accountInfo.totalExpense
      wx.setNavigationBarTitle({
        title: `小叶记帐 - ${accountInfo.title}`,
      })
    } catch (err) {
      error.value = err.message || '加载账本失败，请稍后重试'
      currentAccount.value = {}
      rawBills.value = []
    }
  }

  // 刷新数据
  function loadData() {
    const query = {
      month: monthValue.value,
      type: typeValue.value,
    }
    resetAndFetchBills(query)
  }

  // 监听筛选条件变化，自动重新获取数据
  watch([monthValue, typeValue], () => {
    loadData()
  })

  watch(getApp().globalData.account, async (value) => {
    currentAccount.value = value
    resetQuery()
    await loadAccount()
    loadData()
  })

  // 初始化时获取数据
  ;(async function (params) {
    await loadAccount()
    loadData()
  })()

  // 页面显示时刷新数据
  onShow(() => {
    loadData()
  })

  function updateAccountSummary(res) {
    totalIncome.value = res.summary?.totalIncome ?? res.account?.totalIncome
    totalExpense.value = res.summary?.totalExpense ?? res.account?.totalExpense
    totalBalance.value = res.account?.balance
  }

  function updateBills(bills) {
    let needsReSort = false

    bills.forEach((bill) => {
      const newBill = { ...bill, accountId: currentAccount.value._id }
      // 纠正金额正负号，确保其与类别匹配，以供UI正确渲染
      if (newBill.category.type === '10' && newBill.amount < 0) {
        newBill.amount = -newBill.amount
      } else if (newBill.category.type === '20' && newBill.amount > 0) {
        newBill.amount = -newBill.amount
      }

      const billMonth = formatDate(newBill.datetime, 'YYYY-MM')
      const billType = newBill.category.type.toString()

      const isMonthMatch = !monthValue.value || monthValue.value === billMonth
      const isTypeMatch = !typeValue.value || typeValue.value === billType
      const isMatch = isMonthMatch && isTypeMatch

      const index = rawBills.value.findIndex((b) => b._id === newBill._id)

      if (index > -1) {
        if (isMatch) {
          rawBills.value.splice(index, 1, newBill)
        } else {
          rawBills.value.splice(index, 1)
        }
      } else if (isMatch) {
        rawBills.value.push(newBill)
        needsReSort = true
      }
    })

    if (needsReSort) {
      rawBills.value = orderBy(rawBills.value, ['datetime'], ['desc'])
    }
  }

  function removeBills(bills) {
    const idsToRemove = new Set(bills.map((b) => b._id))
    rawBills.value = rawBills.value.filter((b) => !idsToRemove.has(b._id))
  }

  return {
    error,
    currentAccount,
    rawBills,
    dailyBills,
    typeValue,
    monthValue,
    totalExpense,
    totalIncome,
    totalBalance,
    loading,
    searchText,
    hasMore,
    notes,
    loadData,
    loadMore,
    updateAccountSummary,
    updateBills,
    removeBills,
    updateSearchText,
  }
}

export const storeKey = Symbol('account-store')
