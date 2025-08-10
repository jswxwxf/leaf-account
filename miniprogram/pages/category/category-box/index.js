import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    category: {
      type: Object,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    const onDelete = () => {
      triggerEvent('delete', props.category)
    }

    const onEdit = () => {
      triggerEvent('edit', props.category)
    }

    return {
      onDelete,
      onEdit,
    }
  },
})
