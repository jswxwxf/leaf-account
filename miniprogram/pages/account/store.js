import { ref, computed, onShow } from '@vue-mini/core'
import { sumBy, orderBy } from 'lodash'
import { DateTime } from '@/utils/date.js'
import { getBills } from '@/api/bill.js'
import { groupBillsByDate } from '@/service/bill-service.js'

export default function store() {
  // 原始账单列表
  const rawBills = ref([])
  const loading = ref(false)

  // 按天分组的账单
  const dailyBills = computed(() => groupBillsByDate(rawBills.value))

  // 筛选器值
  const typeValue = ref(0)
  const dateValue = ref(0) // TODO: 后续用于月份筛选

  // 总计
  const totalExpense = computed(() =>
    sumBy(rawBills.value, (bill) => (bill.amount < 0 ? Math.abs(bill.amount) : 0)).toFixed(2),
  )

  const totalIncome = computed(() =>
    sumBy(rawBills.value, (bill) => (bill.amount > 0 ? bill.amount : 0)).toFixed(2),
  )

  // 获取账单数据
  async function fetchBills(params = {}) {
    if (loading.value) return
    loading.value = true

    const res = await getBills(params).finally(() => {
      loading.value = false
    })

    if (!res) {
      rawBills.value = []
      return
    }

    rawBills.value = orderBy(res, ['date', 'time'], ['desc', 'desc'])
  }

  // 页面生成时获取初始数据
  fetchBills({ date_like: DateTime.now().toFormat('yyyy-MM') })

  // 页面显示时刷新数据
  onShow(() => {
    fetchBills({ date_like: DateTime.now().toFormat('yyyy-MM') })
  })

  return {
    dailyBills,
    typeValue,
    dateValue,
    totalExpense,
    totalIncome,
    loading,
    fetchBills, // 暴露 fetchBills 以便将来进行筛选
  }
}

export const storeKey = Symbol('account-store')
