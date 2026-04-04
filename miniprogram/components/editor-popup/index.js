import { defineComponent, ref } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'

defineComponent({
  setup() {
    const visible = ref(false)
    const text = ref('')
    const fieldKey = ref(0)
    let _resolve = null
    let _reject = null

    onTabChange(() => {
      onClose()
    })

    const show = (initialText = '', options = {}) => {
      text.value = initialText
      visible.value = true
      
      // 弹窗显示后过一会儿 touch 一下 key，强制 field 重新渲染以触发 auto-focus
      setTimeout(() => {
        fieldKey.value = Date.now()
      }, 100)

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
      fieldKey,
      show,
      onConfirm,
      onCancel,
      onClose,
      onChange,
    }
  },
})
