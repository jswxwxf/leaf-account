import { onShow, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

export default function store() {
  const accounts = ref([])

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
  }
}

export const storeKey = Symbol('cabinet-store')
