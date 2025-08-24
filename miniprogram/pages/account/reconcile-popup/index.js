import { defineComponent, ref, onReady, onHide } from '@vue-mini/core'

defineComponent({
  setup(props, { triggerEvent, selectComponent }) {
    const visible = ref(false)
    const systemBalance = ref(0)
    const actualBalance = ref(null)
    const form = ref()
    let _resolve
    let _reject

    onReady(() => {
      form.value = selectComponent('#reconcileForm')
    })

    onHide(() => {
      handleClose()
    })

    const show = (balance) => {
      systemBalance.value = balance
      actualBalance.value = null // 重置输入框
      visible.value = true
      form.value.clearErrors()
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const hide = () => {
      visible.value = false
    }

    const onActualBalanceChange = (e) => {
      actualBalance.value = e.detail
    }

    const handleClose = () => {
      hide()
      _reject && _reject(new Error('User canceled'))
    }

    const handleConfirm = async () => {
      const result = await form.value.validate({ actualBalance: actualBalance.value })
      if (result.isInvalid) {
        return
      }

      hide()
      _resolve({
        actualBalance: parseFloat(actualBalance.value) || 0,
      })
    }

    return {
      visible,
      systemBalance,
      actualBalance,
      show,
      onActualBalanceChange,
      handleClose,
      handleConfirm,
    }
  },
})
