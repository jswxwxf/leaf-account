import { defineComponent, computed } from '@vue-mini/core'
import { useFormItem, formItemProps } from '../bill-form/use-form-item.js'
import { showEditorPopup } from '@/utils/helper.js'

defineComponent({
  properties: {
    label: {
      type: String,
    },
    value: {
      type: String,
    },
    placeholder: {
      type: String,
    },
    type: {
      type: String,
      value: 'text',
    },
    ...formItemProps('note'),
  },
  setup(props, { triggerEvent }) {
    const formState = useFormItem(props)

    function handleChange(event) {
      triggerEvent('change', event.detail)
    }

    async function handleIconClick() {
      const newValue = await showEditorPopup(props.value, {
        notes: formState.extra?.notes?.value ?? [],
      })
      triggerEvent('change', newValue)
    }

    return {
      ...formState,
      handleChange,
      handleIconClick,
    }
  },
})
