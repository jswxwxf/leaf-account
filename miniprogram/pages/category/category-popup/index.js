import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const category = ref()
    let _resolve
    let _reject

    const show = (value) => {
      visible.value = true
      category.value = { ...value }
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
      _resolve(category.value)
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      category.value[field] = e.detail
    }

    return {
      visible,
      category,
      show,
      hide,
      handleFormChange,
      handleClose,
      handleConfirm,
    }
  },
})
