import { computed, onShow, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'
import { groupBillsBy } from '@/api/bill.js'

export default function store() {
  const accounts = ref([])
  const groupedBills = ref([])

  // 使用 computed 派生出已开启的账户列表
  const openedAccounts = computed(() => accounts.value.filter((acc) => acc.isOpened))

  const fetchAccounts = async () => {
    const res = await getAccounts()
    accounts.value = res.data
  }

  const fetchGroupedBills = async () => {
    const res = await groupBillsBy('category', {
      exclude: true,
      transfer: false,
      balance: false,
      type: '20',
      accountId: '24e9ff0b6899a77b0023904e59ae74ba',
    })
    groupedBills.value = res.data
  }

  fetchAccounts()
  fetchGroupedBills()

  onShow(() => {
    fetchAccounts()
    fetchGroupedBills()
  })

  return {
    accounts,
    openedAccounts,
    groupedBills,
    fetchAccounts,
    fetchGroupedBills,
  }
}

export const storeKey = Symbol('stats-store')
