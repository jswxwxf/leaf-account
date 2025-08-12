import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    item: {
      type: Object,
      value: {},
    },
    readonly: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent }) {
    const handleEdit = (e) => {
      if (props.readonly) return
      const { bill } = e.currentTarget.dataset
      triggerEvent('edit', bill)
    }

    const handleDelete = (e) => {
      if (props.readonly) return
      const { bill } = e.currentTarget.dataset
      triggerEvent('delete', bill)
    }

    return {
      handleEdit,
      handleDelete,
    }
  },
})
