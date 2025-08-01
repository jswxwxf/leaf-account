import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    type: {
      type: String,
      value: '10',
    },
    size: {
      type: String,
      value: 'normal',
    },
  },
  setup() {
    // No specific logic needed in setup for this component
    return {}
  },
})
