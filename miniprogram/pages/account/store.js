import { ref, computed, onShow } from '@vue-mini/core'
import { sumBy, orderBy } from 'lodash'
import { DateTime } from '@/utils/date.js'
import { getBills } from '@/api/bill.js'
import { groupBillsByDate } from '@/service/bill-service.js'

export default function store() {
  // 原始账单列表
  const rawBills = ref([])
  // 按天分组的账单
  const dailyBills = computed(() => groupBillsByDate(rawBills.value))

  // 筛选器值
  const typeValue = ref(0)
  const dateValue = ref(0) // TODO: 后续用于月份筛选

  // 总计 (使用 lodash)
  const totalExpense = computed(() =>
    sumBy(rawBills.value, (bill) => (bill.amount < 0 ? Math.abs(bill.amount) : 0)).toFixed(2),
  )

  const totalIncome = computed(() =>
    sumBy(rawBills.value, (bill) => (bill.amount > 0 ? bill.amount : 0)).toFixed(2),
  )

  // 获取账单数据
  async function fetchBills(params = {}) {
    try {
      const res = await getBills(params)
      rawBills.value = orderBy(res, ['date', 'time'], ['desc', 'desc'])
    } catch (error) {
      console.error('获取账单失败:', error)
      wx.showToast({ title: '获取账单失败', icon: 'none' })
    }
  }

  fetchBills({ date_like: DateTime.now().toFormat('yyyy-MM') })

  // 页面显示时获取初始数据
  onShow(() => {
    fetchBills({ date_like: DateTime.now().toFormat('yyyy-MM') })
  })

  return {
    dailyBills,
    typeValue,
    dateValue,
    totalExpense,
    totalIncome,
    fetchBills,
  }
}

export const storeKey = Symbol('account-store')
