import { defineComponent, ref, onReady } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'

defineComponent({
  setup(props, { triggerEvent, selectComponent }) {
    const visible = ref(false)
    const formData = ref()
    const form = ref()
    let _resolve
    let _reject

    onReady(() => {
      form.value = selectComponent('#reconcile-form')
    })

    onTabChange(() => {
      handleClose()
    })

    const show = (balance) => {
      // 重置输入框
      formData.value = {
        systemBalance: balance,
        actualBalance: null,
      }
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
      formData.value.actualBalance = e.detail
    }

    const handleClose = () => {
      hide()
      _reject && _reject(new Error('User canceled'))
    }

    const handleConfirm = async () => {
      const result = await form.value.validate(formData.value)
      if (result.isInvalid) {
        return
      }

      hide()
      _resolve({
        actualBalance: parseFloat(formData.value.actualBalance) || 0,
      })
    }

    return {
      visible,
      formData,
      show,
      onActualBalanceChange,
      handleClose,
      handleConfirm,
    }
  },
})
