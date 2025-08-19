import { defineComponent, ref, onHide } from '@vue-mini/core'

defineComponent({
  properties: {
    actions: {
      type: Array,
      value: [],
    },
  },
  setup(props, { triggerEvent }) {
    const showActionSheet = ref(false)

    const onToggleActionSheet = () => {
      showActionSheet.value = !showActionSheet.value
    }

    const onCloseActionSheet = () => {
      showActionSheet.value = false
    }

    const onSelect = (e) => {
      // The event detail from action-sheet is the selected item itself
      triggerEvent('select', e.detail)
      onCloseActionSheet()
    }

    onHide(() => {
      onCloseActionSheet()
    })

    return {
      showActionSheet,
      onToggleActionSheet,
      onCloseActionSheet,
      onSelect,
    }
  },
})
