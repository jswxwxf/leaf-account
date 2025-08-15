import { defineComponent, ref } from '@vue-mini/core'
import { updateAccount } from '@/api/account.js'

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

    const handleRename = async () => {
      triggerEvent('rename', props.account)
    }

    return {
      handleTap,
      handleRename,
    }
  },
})
