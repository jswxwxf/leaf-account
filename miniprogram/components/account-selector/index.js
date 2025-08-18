import { defineComponent, onShow, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

export default defineComponent({
  setup(props, { selectComponent }) {
    const accounts = ref([])
    const visible = ref(false)
    const formData = ref({
      amount: '',
      account: null,
    })
    const mode = ref('simple') // 'simple' or 'full'
    const form = ref()

    // 用于保存 Promise 的 resolve 和 reject 函数
    let _resolve = null
    let _reject = null

    const fetchAccounts = async (currentAccount) => {
      const res = await getAccounts({ opened: true })
      const accountToFilter = currentAccount || getApp().globalData.account.value
      // simple 模式下，action-sheet 需要 name 字段
      if (mode.value === 'simple') {
        accounts.value = res.data
          .filter((item) => item._id !== accountToFilter._id)
          .map((item) => ({ ...item, name: item.title }))
      } else {
        accounts.value = res.data.filter((item) => item._id !== accountToFilter._id)
      }
    }

    const show = async (options = { mode: 'simple' }) => {
      mode.value = options.mode
      await fetchAccounts(options.currentAccount)
      form.value = selectComponent('#form')
      if (accounts.value.length === 0) {
        return Promise.resolve()
      }

      visible.value = true
      // 如果是 full 模式，重置状态
      if (mode.value === 'full') {
        formData.value = {
          amount: '',
          account: null,
        }
      }

      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onClose = () => {
      visible.value = false
      _reject(new Error('User cancelled'))
    }

    // for simple mode (van-action-sheet)
    const onSelectSimple = (event) => {
      visible.value = false
      _resolve(event.detail)
    }

    // for full mode (van-popup)
    const onRadioClick = (event) => {
      formData.value.account = event.currentTarget.dataset.item
    }

    const onAmountChange = (event) => {
      formData.value.amount = event.detail
    }

    const onConfirm = async () => {
      if (!formData.value.account) {
        wx.showToast({ title: '请选择一个账户', icon: 'none' })
        return
      }

      const result = await form.value.validate(formData.value)
      if (result.isInvalid) {
        return
      }

      visible.value = false
      _resolve({
        account: formData.value.account,
        amount: Number(formData.value.amount),
      })
    }

    return {
      accounts,
      visible,
      formData,
      mode,
      form,
      show,
      onClose,
      onSelectSimple,
      onRadioClick,
      onAmountChange,
      onConfirm,
    }
  },
})
