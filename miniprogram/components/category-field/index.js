import { defineComponent } from '@vue-mini/core'
import { showCategoryPopup } from '@/utils/index.js'
import { useFormItem, formItemProps } from '../bill-form/use-form-item.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '分类',
    },
    value: {
      type: Object,
      value: {},
    },
    placeholder: {
      type: String,
      value: '请选择分类',
    },
    ...formItemProps('category'),
  },
  setup(props, { triggerEvent }) {
    const formState = useFormItem(props)
    const { clearError } = formState

    async function handleClick() {
      clearError()
      const result = await showCategoryPopup()
      triggerEvent('change', result)
    }

    return {
      ...formState,
      handleClick,
    }
  },
})
