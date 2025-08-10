import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const tag = ref()
    let _resolve
    let _reject

    const show = (value) => {
      visible.value = true
      tag.value = { ...value }
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
      _reject()
    }

    const handleConfirm = () => {
      hide()
      _resolve(tag.value)
    }

    const handleFormChange = (e) => {
      tag.value = e.detail
    }

    return {
      visible,
      tag,
      show,
      hide,
      handleFormChange,
      handleClose,
      handleConfirm,
    }
  },
})
