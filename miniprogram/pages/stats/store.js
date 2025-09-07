import { computed, onShow, ref, watch } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'
import { groupBillsBy } from '@/api/bill.js'
import { onAccountChange } from '@/utils/index.js'
import { showAccountsSelector, showMonthSelector } from '@/utils/helper.js'

export default function store() {
  const accounts = ref([])
  const selectedAccounts = ref([])
  const groupedBills = ref([])

  const dimension = ref('category')
  const monthValue = ref('')
  const checkedValue = ref(['exclude'])
  const typeValue = ref('all')

  // 使用 computed 派生出已开启的账户列表
  const availableAccounts = computed(() => accounts.value.filter((acc) => acc.showInStats))

  const fetchAccounts = async () => {
    const res = await getAccounts({ opened: true })
    accounts.value = res.data
  }

  const fetchGroupedBills = async () => {
    const res = await groupBillsBy(dimension.value, {
      exclude: checkedValue.value.includes('exclude'),
      transfer: checkedValue.value.includes('transfer'),
      balance: checkedValue.value.includes('balance'),
      type: typeValue.value === 'all' ? undefined : typeValue.value,
      accounts: selectedAccounts.value,
      month: monthValue.value,
    })
    groupedBills.value = res.data
  }

  watch([dimension, monthValue, checkedValue, typeValue], () => fetchGroupedBills())

  onAccountChange(
    (newAccount) => {
      if (!selectedAccounts.value.map(x => x._id).includes(newAccount._id)) {
        selectedAccounts.value = [newAccount]
      }
    },
    { immediate: true },
  )

  const onSelectAccounts = async (e) => {
    selectedAccounts.value = await showAccountsSelector(selectedAccounts.value, {
      hideStats: true,
    })
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
    selectedAccounts,
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
    onSelectAccounts,
    onCheckedChange,
    onTypeChange,
  }
}

export const storeKey = Symbol('stats-store')
