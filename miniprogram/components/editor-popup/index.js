import { defineComponent, onHide, ref } from '@vue-mini/core'

defineComponent({
  setup() {
    const visible = ref(false)
    const text = ref('')
    let _resolve = null
    let _reject = null

    onHide(() => {
      onClose()
    })

    const show = (initialText = '') => {
      text.value = initialText
      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onConfirm = () => {
      if (_resolve) {
        _resolve(text.value)
      }
      visible.value = false
    }

    const onCancel = () => {
      if (_reject) {
        _reject(new Error('用户取消'))
      }
      visible.value = false
    }

    const onClose = () => {
      if (_reject) {
        _reject(new Error('用户关闭'))
      }
      visible.value = false
    }

    const onChange = (event) => {
      text.value = event.detail
    }

    return {
      visible,
      text,
      show,
      onConfirm,
      onCancel,
      onClose,
      onChange,
    }
  },
})
