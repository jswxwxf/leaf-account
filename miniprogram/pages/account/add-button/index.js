import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    hidden: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggetEvent }) {
    const handleTap = (e) => {
      triggetEvent('tap', e)
    }

    return {
      handleTap,
    }
  },
})
