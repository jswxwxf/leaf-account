import { defineComponent, ref, onReady } from '@vue-mini/core'

defineComponent({
  properties: {
    value: {
      type: Object,
      default: { name: '', type: '10' },
    },
    isEdit: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent, selectComponent }) {
    const tagForm = ref()
    const errors = ref()

    onReady(() => {
      tagForm.value = selectComponent('#tagForm')
    })

    const handleFormInit = (e) => {
      e.detail.registerRule('name', 'required|max:4')
      errors.value = e.detail.errors
    }

    const handleNameChange = (e) => {
      const newName = e.detail
      triggerEvent('change', { ...props.value, name: newName })
    }

    const handleTypeChange = (e) => {
      const { type } = e.currentTarget.dataset
      triggerEvent('change', { ...props.value, type })
    }

    const handleSubmit = async () => {
      const result = await tagForm.value.validate(props.value)
      if (result.isInvalid) {
        return
      }
      triggerEvent('submit', props.value)
    }

    return {
      errors,
      handleFormInit,
      handleNameChange,
      handleTypeChange,
      handleSubmit,
    }
  },
})
