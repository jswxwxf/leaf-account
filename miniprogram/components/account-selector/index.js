import { defineComponent, onShow, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

export default defineComponent({
  setup() {
    const accounts = ref([])
    const visible = ref(false)

    // 用于保存 Promise 的 resolve 和 reject 函数
    let _resolve = null
    let _reject = null

    const fetchAccounts = async (currentAccount) => {
      const res = await getAccounts({ opened: true })
      const accountToFilter = currentAccount || getApp().globalData.account.value
      // action-sheet 需要 name 字段
      accounts.value = res.data
        .filter((item) => item.name !== accountToFilter.name)
        .map((item) => ({ ...item, name: item.title }))
    }

    const show = async (options = {}) => {
      await fetchAccounts(options.currentAccount)
      if (accounts.value.length === 0) {
        return Promise.resolve()
      }

      visible.value = true

      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onClose = () => {
      visible.value = false
      _reject(new Error('User cancelled'))
    }

    const onSelect = (event) => {
      visible.value = false
      _resolve(event.detail)
    }

    return {
      accounts,
      visible,
      show,
      onClose,
      onSelect,
    }
  },
})
