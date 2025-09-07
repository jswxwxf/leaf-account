import { computed, onShow, ref, watch } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'
import { groupBillsBy } from '@/api/bill.js'
import { onAccountChange } from '@/utils/index.js'
import { showAccountSelector, showMonthSelector } from '@/utils/helper.js'

export default function store() {
  const accounts = ref([])
  const account = ref()
  const groupedBills = ref([])

  const dimension = ref('category')
  const monthValue = ref('')
  const checkedValue = ref(['exclude'])
  const typeValue = ref('all')

  // 使用 computed 派生出已开启的账户列表
  const availableAccounts = computed(() => accounts.value.filter((acc) => acc.isOpened))

  const fetchAccounts = async () => {
    const res = await getAccounts()
    accounts.value = res.data
  }

  const fetchGroupedBills = async () => {
    const res = await groupBillsBy(dimension.value, {
      exclude: checkedValue.value.includes('exclude'),
      transfer: checkedValue.value.includes('transfer'),
      balance: checkedValue.value.includes('balance'),
      type: typeValue.value === 'all' ? undefined : typeValue.value,
      accountId: account.value?._id,
      month: monthValue.value,
    })
    groupedBills.value = res.data
  }

  watch([dimension, monthValue, checkedValue, typeValue], () => fetchGroupedBills())

  onAccountChange(
    (newAccount) => {
      account.value = newAccount
    },
    { immediate: true },
  )

  const onChangeAccount = async (e) => {
    account.value = await showAccountSelector({ currentAccount: account.value })
    fetchGroupedBills()
  }

  const onDimensionChange = (e) => {
    dimension.value = e.detail
  }

  const onMonthChange = async (e) => {
    monthValue.value = await showMonthSelector(monthValue.value)
  }

  const onCheckedChange = (e) => {
    checkedValue.value = e.detail
  }

  const onTypeChange = (e) => {
    typeValue.value = e.detail
  }

  fetchAccounts()
  fetchGroupedBills()

  onShow(() => {
    fetchAccounts()
    fetchGroupedBills()
  })

  return {
    accounts,
    account,
    availableAccounts,
    groupedBills,
    dimension,
    monthValue,
    checkedValue,
    typeValue,
    fetchAccounts,
    fetchGroupedBills,
    onDimensionChange,
    onMonthChange,
    onChangeAccount,
    onCheckedChange,
    onTypeChange,
  }
}

export const storeKey = Symbol('stats-store')
