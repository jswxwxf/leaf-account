import { defineComponent, ref, onReady, inject } from '@vue-mini/core'
import { storeKey } from '../store'

defineComponent({
  setup(props, { selectComponent }) {
    const { searchText, updateSearchText } = inject(storeKey)

    const visible = ref(false)
    const bill = ref({})
    const billForm = ref()

    onReady(() => {
      // 获取表单组件实例
      billForm.value = selectComponent('#billForm')
    })

    let _resolve, _reject

    const show = (value) => {
      bill.value = value
      visible.value = true
      billForm.value.clearErrors()
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const handleClose = () => {
      _reject(new Error('用户取消'))
      visible.value = false
    }

    const handleConfirm = async () => {
      const result = await billForm.value.validate(bill.value)
      if (result.isInvalid) {
        return
      }

      _resolve({ ...bill.value })
      visible.value = false
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
      bill.value[field] = value
      if (value.note) {
        bill.value.note = value.note
      }
    }

    return {
      visible,
      bill,
      searchText,
      show,
      handleClose,
      handleConfirm,
      handleFormChange,
      updateSearchText,
    }
  },
})
