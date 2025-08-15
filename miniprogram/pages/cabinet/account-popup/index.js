import { defineComponent, onReady, ref } from '@vue-mini/core'
import { updateAccount } from '@/api/account.js'

defineComponent({
  setup(props, { selectComponent }) {
    const visible = ref(false)
    const form = ref(null)
    let account = ref()
    let _resolve = null
    let _reject = null

    onReady(() => {
      form.value = selectComponent('#form')
    })

    const show = (value) => {
      account.value = { ...value }
      visible.value = true
      form.value?.clearErrors()
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onClose = () => {
      visible.value = false
      if (_reject) {
        _reject()
      }
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
      account.value[field] = value
    }

    const onConfirm = async () => {
      const result = await form.value.validate(account.value)
      if (result.isInvalid) {
        return
      }
      _resolve(account.value)
      visible.value = false
    }

    return {
      visible,
      form,
      account,
      show,
      onConfirm,
      onClose,
      handleFormChange,
    }
  },
})
