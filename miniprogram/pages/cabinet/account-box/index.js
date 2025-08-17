import { computed, defineComponent, inject, ref } from '@vue-mini/core'
import { updateAccount } from '@/api/account.js'
import { storeKey } from '../store'

defineComponent({
  properties: {
    account: {
      type: Object,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    const { accounts } = inject(storeKey)

    const enableTransfer = computed(() => {
      return accounts.value.filter((a) => a.isOpened).length >= 2 && props.account.isOpened
    })

    const handleTap = () => {
      triggerEvent('tapped', props.account)
    }

    const handleRename = async () => {
      triggerEvent('rename', props.account)
    }

    return {
      enableTransfer,
      handleTap,
      handleRename,
    }
  },
})
