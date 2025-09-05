import { computed, onShow, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

export default function store() {
  const accounts = ref([])

  // 使用 computed 派生出已开启的账户列表
  const openedAccounts = computed(() => accounts.value.filter((acc) => acc.isOpened))

  const fetchAccounts = async () => {
    const res = await getAccounts()
    accounts.value = res.data
  }

  fetchAccounts()

  onShow(() => {
    fetchAccounts()
  })

  return {
    accounts,
    openedAccounts,
    fetchAccounts,
  }
}

export const storeKey = Symbol('stats-store')
