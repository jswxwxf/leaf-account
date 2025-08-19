import { defineComponent, onHide, ref } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

export default defineComponent({
  setup(props, { selectComponent }) {
    const accounts = ref([])
    const visible = ref(false)
    const formData = ref({
      amount: '',
      account: null,
    })
    const form = ref()

    // 用于保存 Promise 的 resolve 和 reject 函数
    let _resolve = null
    let _reject = null

    const fetchAccounts = async (currentAccount) => {
      const res = await getAccounts({ opened: true })
      const accountToFilter = currentAccount || getApp().globalData.account.value
      accounts.value = res.data.filter((item) => item.name !== accountToFilter.name)
    }

    onHide(() => {
      onClose()
    })

    const show = async (options = {}) => {
      await fetchAccounts(options.currentAccount)
      form.value = selectComponent('#form')
      visible.value = true
      // 重置状态
      formData.value = {
        amount: '',
        account: null,
      }

      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onClose = () => {
      visible.value = false
      _reject && _reject(new Error('User cancelled'))
    }

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
      form,
      show,
      onClose,
      onRadioClick,
      onAmountChange,
      onConfirm,
    }
  },
})
