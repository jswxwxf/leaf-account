import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    tag: {
      type: Object,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    const onDelete = () => {
      if (props.tag.isBuiltIn) return
      triggerEvent('delete', props.tag)
    }

    const onEdit = () => {
      if (props.tag.isBuiltIn) return
      triggerEvent('edit', props.tag)
    }

    return {
      onDelete,
      onEdit,
    }
  },
})
