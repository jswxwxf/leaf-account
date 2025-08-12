import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  setup() {
    const visible = ref(false)
    const content = ref()

    let _resolve
    let _reject

    const show = (text) => {
      content.value = text || ''
      visible.value = true
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
      _reject(new Error('用户取消了操作'))
    }

    const handleConfirm = () => {
      hide()
      _resolve(content.value)
    }

    const handleChange = (e) => {
      content.value = e.detail.value
    }

    return {
      visible,
      content,
      show,
      handleClose,
      handleConfirm,
      handleChange,
    }
  },
})
