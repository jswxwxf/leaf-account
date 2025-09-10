import { ref, computed, onShow, watch } from '@vue-mini/core'
import { sumBy, orderBy } from 'lodash'
import dayjs from 'dayjs'
import { getBills } from '@/api/bill.js'
import { getAccount } from '@/api/account.js'
import { groupBillsByDate, isBillMatch } from '@/service/bill-service.js'
import { getCurrentMonth, formatDate } from '@/utils/date.js'
import { isCurrentPage, until, onAccountChange, onQueryChange } from '@/utils/index.js'

export const MAX_BATCH_BILLS = 20

function useBills(rawBills, monthValue, queryData) {
  const totalIncome = ref(0)
  const totalExpense = ref(0)
  const totalBalance = ref(0)

  function updateAccountSummary(res) {
    totalIncome.value = res.summary?.totalIncome ?? res.account?.totalIncome
    totalExpense.value = res.summary?.totalExpense ?? res.account?.totalExpense
    totalBalance.value = res.account?.balance
  }

  function updateBills(bills, currentAccountId) {
    let needsReSort = false

    bills.forEach((bill) => {
      const newBill = { ...bill, accountId: currentAccountId }
      // 纠正金额正负号，确保其与类别匹配，以供UI正确渲染
      if (newBill.category.type === '10' && newBill.amount < 0) {
        newBill.amount = -newBill.amount
      } else if (newBill.category.type === '20' && newBill.amount > 0) {
        newBill.amount = -newBill.amount
      }

      const billMonth = formatDate(newBill.datetime, 'YYYY-MM')
      const isMonthMatch = !monthValue.value || monthValue.value === billMonth
      // 使用新的匹配逻辑
      const isMatch = isMonthMatch && isBillMatch(newBill, queryData.value)

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

  function removeBills(items) {
    if (!Array.isArray(items) || items.length === 0) return

    let idsToRemove
    // 判断传入的是对象数组还是ID数组
    if (typeof items[0] === 'object' && items[0] !== null) {
      idsToRemove = new Set(items.map((b) => b._id))
    } else {
      idsToRemove = new Set(items)
    }

    rawBills.value = rawBills.value.filter((b) => !idsToRemove.has(b._id))
  }

  return {
    totalIncome,
    totalExpense,
    totalBalance,
    updateBills,
    removeBills,
    updateAccountSummary,
  }
}

function useUIState(rawBills) {
  const searchText = ref('')

  const billPopped = ref(false)
  const batchEditPopped = ref(false)

  const queryDropDownClosed = ref()

  function updateSearchText(e) {
    searchText.value = e.detail
  }

  const notes = computed(() => {
    const allNotes = rawBills.value.map((bill) => bill.note).filter(Boolean)
    return [...new Set(allNotes)]
  })

  return {
    searchText,
    billPopped,
    batchEditPopped,
    notes,
    queryDropDownClosed,
    updateSearchText,
  }
}

function useAccount(rawBills, billsManager) {
  const currentAccount = ref({})
  const error = ref(null)

  async function loadAccount() {
    const name = getApp().globalData.account.value.name
    error.value = null

    try {
      const { data: accountInfo } = await getAccount(name)
      currentAccount.value = accountInfo
      getApp().globalData.account.value.title = accountInfo.title
      getApp().globalData.account.value._id = accountInfo._id
      billsManager.updateAccountSummary({ account: accountInfo })
      await until(() => isCurrentPage('pages/account/index'), { maxRetry: Infinity })
      wx.setNavigationBarTitle({
        title: `小枫记帐 - ${accountInfo.title}`,
      })
      wx.setTabBarItem({
        index: 0,
        text: accountInfo.title,
      })
    } catch (err) {
      error.value = err.message || '加载账本失败，请稍后重试'
      currentAccount.value = {}
      rawBills.value = []
    }
  }

  return {
    currentAccount,
    error,
    loadAccount,
  }
}

function useBatchSelect(rawBills) {
  const batchChecked = ref({})

  function onBatchCheck(e, value) {
    const bill = e?.currentTarget?.dataset?.bill || e
    batchChecked.value[bill._id] = value === undefined ? e.detail : value
  }

  const batchAllChecked = computed(() => {
    if (rawBills.value.length === 0) return false
    return rawBills.value.every((bill) => batchChecked.value[bill._id] === true)
  })

  const batchCheckAll = () => {
    const shouldCheck = !batchAllChecked.value
    rawBills.value.forEach((bill) => {
      onBatchCheck(bill, shouldCheck)
    })
  }

  function clearBatchCheck() {
    batchChecked.value = {}
  }

  return {
    batchChecked,
    batchAllChecked,
    onBatchCheck,
    batchCheckAll,
    clearBatchCheck,
  }
}

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
  const queryData = ref({})
  const monthValue = ref('')

  const uiState = useUIState(rawBills)
  const billsManager = useBills(rawBills, monthValue, queryData)
  const { currentAccount, error, loadAccount } = useAccount(rawBills, billsManager)
  const batchSelectState = useBatchSelect(rawBills)

  function resetQuery() {
    queryData.value = {}
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

      billsManager.updateAccountSummary(res)

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
      ...queryData.value,
      month: monthValue.value,
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
      ...queryData.value,
      month: monthValue.value,
    }
    return resetAndFetchBills(query)
  }

  onQueryChange((query) => {
    monthValue.value = query.month
    queryData.value = {
      categories: query.category ? [query.category] : [],
      exclude: query.exclude,
      excludeTag: !query.exclude,
    }
  })

  // 监听筛选条件变化，自动重新获取数据
  watch([monthValue, queryData], () => {
    loadData()
  })

  onAccountChange(async (newAccount) => {
    rawBills.value = []
    currentAccount.value = newAccount
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

  return {
    error,
    currentAccount,
    rawBills,
    dailyBills,
    queryData,
    monthValue,
    loading,
    hasMore,
    loadData,
    loadMore,
    ...billsManager,
    ...uiState,
    ...batchSelectState,
  }
}

export const storeKey = Symbol('account-store')
