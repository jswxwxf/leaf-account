import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    value: {
      type: String,
      value: '',
    },
  },
  setup(props, { triggetEvent }) {
    const handleFormChange = (event) => {
      triggetEvent('change', event)
    }

    return {
      handleFormChange,
    }
  }
})
