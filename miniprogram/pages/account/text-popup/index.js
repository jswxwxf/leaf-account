import { defineComponent, ref } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'

defineComponent({
  setup() {
    const visible = ref(false)
    const content = ref()
    const placeholder = ref()
    const confirmText = ref()

    let _resolve
    let _reject

    onTabChange(() => {
      handleClose()
    })

    const show = (text, opts = {}) => {
      content.value = text || ''
      placeholder.value = opts.placeholder || '请输入文本...'
      confirmText.value = opts.confirmText || '提交'
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
      _reject && _reject(new Error('用户取消了操作'))
    }

    const handleConfirm = () => {
      hide()
      _resolve(content.value)
    }

    const handleChange = (e) => {
      content.value = e.detail
    }

    return {
      visible,
      content,
      placeholder,
      confirmText,
      show,
      handleClose,
      handleConfirm,
      handleChange,
    }
  },
})
