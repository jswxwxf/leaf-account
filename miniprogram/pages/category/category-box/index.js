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
      if (props.category.isBuiltIn) return
      triggerEvent('delete', props.category)
    }

    const onEdit = () => {
      if (props.category.isBuiltIn) return
      triggerEvent('edit', props.category)
    }

    return {
      onDelete,
      onEdit,
    }
  },
})
