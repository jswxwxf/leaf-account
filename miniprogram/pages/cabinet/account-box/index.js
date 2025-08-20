import { computed, defineComponent, inject } from '@vue-mini/core'
import { showTransferPopup } from '@/utils/index.js'
import { storeKey } from '../store'

defineComponent({
  properties: {
    account: {
      type: Object,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    const { accounts, fetchAccounts } = inject(storeKey)

    const enableTransfer = computed(() => {
      return accounts.value.filter((a) => a.isOpened).length >= 2 && props.account.isOpened
    })

    const handleTap = () => {
      triggerEvent('tapped', props.account)
    }

    const handleRename = async () => {
      triggerEvent('rename', props.account)
    }

    const handleTransfer = async (type) => {
      const { account: targetAccount, amount } = await showTransferPopup({
        currentAccount: props.account,
      })
      triggerEvent('transfer', { currentAccount: props.account, targetAccount, type, amount })
    }

    const handleTransferOut = () => handleTransfer(20) // 20 for expense
    const handleTransferIn = () => handleTransfer(10) // 10 for income

    const handleDeactivate = async () => {
      triggerEvent('deactivate', props.account)
    }

    return {
      enableTransfer,
      handleTap,
      handleRename,
      handleTransferOut,
      handleTransferIn,
      handleDeactivate,
    }
  },
})
