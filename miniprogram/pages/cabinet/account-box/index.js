import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    account: {
      type: Object,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    const handleTap = () => {
      triggerEvent('tapped', props.account)
    }

    return {
      handleTap,
    }
  },
})
