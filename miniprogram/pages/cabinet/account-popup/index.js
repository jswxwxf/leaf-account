import { defineComponent, onHide, onReady, ref } from '@vue-mini/core'
import { updateAccount } from '@/api/account.js'

defineComponent({
  setup(props, { selectComponent }) {
    const visible = ref(false)
    const title = ref()
    const confirmButtonText = ref()
    const form = ref(null)
    let account = ref()
    let _resolve = null
    let _reject = null

    onReady(() => {
      form.value = selectComponent('#form')
    })

    onHide(() => {
      onClose()
    })

    const show = (value, options = {}) => {
      account.value = { ...value }
      visible.value = true
      title.value = options.title || '修改账本名称'
      confirmButtonText.value = options.confirmButtonText || '确认'
      form.value?.clearErrors()
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onClose = () => {
      visible.value = false
      _reject && _reject()
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
      title,
      confirmButtonText,
      form,
      account,
      show,
      onConfirm,
      onClose,
      handleFormChange,
    }
  },
})
