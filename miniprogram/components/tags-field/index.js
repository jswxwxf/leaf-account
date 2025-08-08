import { defineComponent } from '@vue-mini/core'
import { showTagsPopup } from '@/utils/index.js'
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
    ...formItemProps('tags'),
  },
  setup(props, { triggerEvent }) {
    useFormItem(props)
    async function handleClick() {
      const result = await showTagsPopup(props.value)
      triggerEvent('change', result)
    }

    return {
      handleClick,
    }
  },
})
