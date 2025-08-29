import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    item: {
      type: Object,
      value: {}
    },
    selected: {
      type: Boolean,
      value: false,
    },
    size: {
      type: String,
      value: 'normal',
    },
  },
  setup(props, { triggerEvent }) {
    const handleSelect = (e) => {
      triggerEvent('select', props.item)
    }

    return {
      handleSelect,
    }
  },
})
