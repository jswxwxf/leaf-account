import { defineComponent, ref } from '@vue-mini/core'

export default defineComponent({
  setup() {
    const visible = ref(false)

    const show = () => {
      visible.value = true
    }

    const onClose = () => {
      visible.value = false
    }

    return {
      visible,
      show,
      onClose,
    }
  },
})
