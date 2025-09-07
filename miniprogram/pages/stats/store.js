import { computed, onShow, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'
import { groupBillsBy } from '@/api/bill.js'
import { onAccountChange } from '@/utils/index.js'
import { showAccountSelector } from '@/utils/helper.js'

function useFilter() {
  const account = ref()
  const checkedValue = ref([])
  const typeValue = ref('all')

  onAccountChange(
    (newAccount) => {
      account.value = newAccount
    },
    { immediate: true },
  )

  const onChangeAccount = async (e) => {
    account.value = await showAccountSelector({ currentAccount: account.value })
  }

  const onCheckedChange = (e) => {
    checkedValue.value = e.detail
  }

  const onTypeChange = (e) => {
    typeValue.value = e.detail
  }

  return {
    account,
    checkedValue,
    typeValue,
    onChangeAccount,
    onCheckedChange,
    onTypeChange,
  }
}

export default function store() {
  const accounts = ref([])
  const groupedBills = ref([])

  const filterState = useFilter()

  // 使用 computed 派生出已开启的账户列表
  const availableAccounts = computed(() => accounts.value.filter((acc) => acc.isOpened))

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
    availableAccounts,
    groupedBills,
    fetchAccounts,
    fetchGroupedBills,
    ...filterState,
  }
}

export const storeKey = Symbol('stats-store')
