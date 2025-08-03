import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    item: {
      type: Object,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    const handleEdit = (e) => {
      const { bill } = e.currentTarget.dataset
      triggerEvent('edit', bill)
    }

    return {
      handleEdit,
    }
  },
})
