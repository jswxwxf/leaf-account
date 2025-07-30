import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  properties: {
    actions: {
      type: Array,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    const showPopover = ref(false)

    const onTogglePopover = () => {
      showPopover.value = !showPopover.value
    }

    const onClosePopover = () => {
      showPopover.value = false
    }

    const onSelect = (e) => {
      triggerEvent('select', e.detail)
      onClosePopover()
    }

    return {
      showPopover,
      onTogglePopover,
      onClosePopover,
      onSelect,
    }
  },
})
