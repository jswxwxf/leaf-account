import { defineComponent, ref, onReady } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

defineComponent({
  setup() {
    const books = ref([])

    const fetchAccounts = async () => {
      const res = await getAccounts()
      books.value = res.data
    }

    fetchAccounts()

    onReady(() => {
      fetchAccounts()
    })

    return {
      books,
    }
  },
})
