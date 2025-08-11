import { defineComponent, ref } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'

defineComponent({
  setup() {
    const visible = ref(false)
    const content = ref('')
    let _resolve

    const show = (newContent) => {
      content.value = newContent
      visible.value = true
      return new Promise((resolve) => {
        _resolve = resolve
      })
    }

    const hide = () => {
      visible.value = false
      _resolve()
    }

    const handleClose = () => {
      hide()
    }

    const handleCopy = () => {
      wx.setClipboardData({
        data: content.value
      })
    }

    return {
      visible,
      content,
      show,
      handleClose,
      handleCopy,
    }
  },
})
