import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  props: {
    initialData: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const visible = ref(false)
    const bill = ref({})

    let _resolve, _reject

    const show = () => {
      bill.value = { ...props.initialData }
      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const handleClose = () => {
      _reject(new Error('用户取消'))
      visible.value = false
    }

    const handleConfirm = () => {
      _resolve(bill.value)
      visible.value = false
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      const { value } = e.detail
      bill.value[field] = value
    }

    return {
      visible,
      bill,
      show,
      handleClose,
      handleConfirm,
      handleFormChange,
    }
  },
})
