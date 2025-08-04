import { defineComponent, ref } from '@vue-mini/core'
import { isEmpty } from 'lodash'

defineComponent({
  setup() {
    const visible = ref(false)
    const list = ref([])

    let _resolve, _reject

    const show = () => {
      list.value = Array.from({ length: 3 }, () => ({
        datetime: Date.now(),
        category: '',
        amount: '',
        note: '',
        tags: [],
      }))
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
      _resolve(list.value)
      visible.value = false
    }

    const handleFormChange = (e) => {
      const { rowIndex, field } = e.currentTarget.dataset
      // 自定义组件的 value 在 e.detail 中，而不是 e.detail.value
      list.value[rowIndex][field] = e.detail
    }

    return {
      visible,
      list,
      show,
      handleClose,
      handleConfirm,
      handleFormChange,
    }
  },
})
