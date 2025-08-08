import { defineComponent, ref, onReady } from '@vue-mini/core'

defineComponent({
  setup(props, { selectComponent }) {
    const visible = ref(false)
    const bill = ref({})
    const billForm = ref()

    onReady(() => {
      // 获取表单组件实例
      billForm.value = selectComponent('#billForm')

      // 手动为 van-field 等无法使用 useFormItem 的组件注册校验规则
      // 这是对第三方组件或原生组件进行校验的推荐做法
      billForm.value.registerRule('note', 'required')
    })

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

    const handleConfirm = async () => {
      const valid = await billForm.value.validate(bill.value)
      if (!valid) return

      _resolve({ ...bill.value })
      visible.value = false
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
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
