import { defineComponent, ref } from '@vue-mini/core'
import { getAccountYears, exportAccount } from '@/api/account.js'

export default defineComponent({
  setup() {
    const visible = ref(false)
    const currentAccount = ref(null)
    const mode = ref() // 'import' | 'export'
    const year = ref()
    const yearOptions = ref([])

    let _resolve
    let _reject

    const fetchYears = async (accountId) => {
      const res = await getAccountYears(accountId)
      yearOptions.value = res.data.map((y) => ({ text: `${y}年`, value: y }))
      year.value = res.data[0]
    }

    const show = async (account, options = {}) => {
      visible.value = true
      currentAccount.value = account
      mode.value = options.mode || 'import'
      await fetchYears(account._id)

      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onClose = () => {
      visible.value = false
      _reject && _reject(new Error('用户取消'))
    }

    const onTap = async () => {
      await exportAccount(currentAccount.value._id, year.value)
    }

    return {
      visible,
      mode,
      currentAccount,
      year,
      yearOptions,
      show,
      onClose,
      onTap,
    }
  },
})
