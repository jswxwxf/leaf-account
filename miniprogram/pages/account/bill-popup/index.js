import { defineComponent, ref, onReady } from '@vue-mini/core'

defineComponent({
  setup(props, { selectComponent }) {
    const visible = ref(false)
    const bill = ref({})

    let _resolve, _reject

    const show = (value) => {
      bill.value = value
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
      _resolve({ ...bill.value })
      visible.value = false
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
      bill.value[field] = value
    }

    const handleShowCategoryPopup = async () => {
      try {
        const categoryResult = await categoryPopupWrapper.show({ type: bill.value.type })
        if (typeof categoryResult === 'object' && categoryResult.name) {
          // 如果是新创建的分类，返回的是对象
          // TODO: 这里可以调用接口保存新分类
          bill.value.category = categoryResult.name
        } else {
          // 如果是选择的已有分类，返回的是字符串
          bill.value.category = categoryResult
        }
      } catch (err) {
        // 用户取消
      }
    }

    return {
      visible,
      bill,
      show,
      handleClose,
      handleConfirm,
      handleFormChange,
      handleShowCategoryPopup,
    }
  },
})
