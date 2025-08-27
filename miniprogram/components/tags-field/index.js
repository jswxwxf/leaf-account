import { defineComponent } from '@vue-mini/core'
import { showTagsSelector } from '@/utils/helper.js'
import { useFormItem, formItemProps } from '../bill-form/use-form-item.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '标签',
    },
    value: {
      type: Array,
      value: [],
    },
    placeholder: {
      type: String,
      value: '请选择标签',
    },
    disabled: {
      type: Boolean,
      value: false
    },
    ...formItemProps('tags'),
  },
  setup(props, { triggerEvent }) {
    const formState = useFormItem(props)
    const { clearError } = formState

    async function handleClick() {
      clearError()
      const result = await showTagsSelector(props.value)
      triggerEvent('change', result)
    }

    return {
      ...formState,
      handleClick,
    }
  },
})
