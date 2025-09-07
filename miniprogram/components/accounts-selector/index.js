import { defineComponent, ref } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'
import { getAccounts } from '@/api/account.js'

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const accounts = ref([])
    const selectedIds = ref([])
    const options = ref({})

    let _resolve, _reject

    onTabChange(() => {
      handleClose()
    })

    const fetchAccounts = async (opts = {}) => {
      try {
        const res = await getAccounts({ opened: true })
        accounts.value = res.data.filter((item) => {
          if (opts.hideStats) {
            return item.showInStats
          }
          return true
        })
      } catch (error) {
        console.error('获取账户列表失败:', error)
      }
    }

    const show = (value, opts = {}) => {
      options.value = opts
      visible.value = true
      // 支持多选，value 是一个 account 对象数组
      selectedIds.value = Array.isArray(value) ? value.map((item) => item._id) : []
      fetchAccounts(opts) // 每次显示时都重新获取最新的账户列表
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const hide = () => {
      visible.value = false
    }

    const handleClose = () => {
      hide()
      _reject && _reject(new Error('用户取消'))
    }

    const onAccountsChange = (event) => {
      selectedIds.value = event.detail
    }

    const handleConfirm = () => {
      hide()
      const selectedAccounts = accounts.value.filter((acc) => selectedIds.value.includes(acc._id))
      _resolve(selectedAccounts)
    }

    return {
      visible,
      accounts,
      options,
      selectedIds,
      show,
      handleClose,
      onAccountsChange,
      handleConfirm,
    }
  },
})
