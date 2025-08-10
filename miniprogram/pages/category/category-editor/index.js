import { defineComponent, ref, onReady } from '@vue-mini/core'

defineComponent({
  properties: {
    value: {
      type: Object,
      default: { name: '' },
    },
    isEdit: {
      type: Boolean,
      value: false
    }
  },
  setup(props, { triggerEvent, selectComponent }) {
    const categoryForm = ref()

    onReady(() => {
      categoryForm.value = selectComponent('#categoryForm')
    })

    const handleChange = (e) => {
      // const { field } = e.currentTarget.dataset
      const value = e.detail
      triggerEvent('change', value)
    }

    const handleSubmit = async () => {
      const result = await categoryForm.value.validate(props.value)
      if (result.isInvalid) {
        return
      }
      triggerEvent('submit', props.value)
    }

    return {
      handleChange,
      handleSubmit,
    }
  },
})
