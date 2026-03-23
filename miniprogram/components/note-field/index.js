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
    disabled: {
      type: Boolean,
      value: false,
    },
    moveable: {
      type: Boolean,
      value: false,
    },
    ...formItemProps('note'),
  },
  setup(props, { triggerEvent }) {
    const formState = useFormItem(props)

    function handleChange(event) {
      triggerEvent('change', event.detail)
    }

    async function handleIconClick() {
      const newValue = await showEditorPopup(props.value)
      triggerEvent('change', newValue)
    }

    async function handleUpClick() {
      triggerEvent('position', 'up')
    }

    async function handleDownClick() {
      triggerEvent('position', 'down')
    }

    return {
      ...formState,
      handleChange,
      handleIconClick,
      handleUpClick,
      handleDownClick,
    }
  },
})
