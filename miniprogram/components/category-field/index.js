import { defineComponent } from '@vue-mini/core'
import { showCategorySelector } from '@/utils/helper.js'
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
    disabled: {
      type: Boolean,
      value: false,
    },
    options: {
      type: Object,
      value: {}, // { disableNew, disableTransfer, disableTransferAccount, disableType, allowMultiple }
    },
    ...formItemProps('category'),
  },
  setup(props, { triggerEvent }) {
    const formState = useFormItem(props)
    const { clearError } = formState

    async function handleClick() {
      if (props.disabled) return
      clearError()
      const result = await showCategorySelector(undefined, props.options)
      triggerEvent('change', result)
    }

    return {
      ...formState,
      handleClick,
    }
  },
})
