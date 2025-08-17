import { defineComponent, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

export default defineComponent({
  setup() {
    const accounts = ref([])
    const visible = ref(false)

    // 用于保存 Promise 的 resolve 和 reject 函数
    let _resolve = null
    let _reject = null

    const fetchAccounts = async () => {
      const res = await getAccounts({ opened: true })
      // van-action-sheet 需要 name 字段
      const currentAccount = getApp().globalData.account.value
      accounts.value = res.data
        .filter((item) => item.name !== currentAccount.name)
        .map((item) => ({ ...item, name: item.title }))
    }

    // 预加载
    fetchAccounts()

    const show = async () => {
      await fetchAccounts()
      // 如果没有可选账户，选择器不弹出，直接返回
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
      // 如果是用户点击了取消，则 reject Promise
      _reject(new Error('User cancelled'))
    }

    const onSelect = (event) => {
      visible.value = false
      // 如果用户选择了项目，则 resolve Promise
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
