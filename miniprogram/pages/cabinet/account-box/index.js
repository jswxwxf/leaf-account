import { computed, defineComponent, inject } from '@vue-mini/core'
import { showAccountSelector } from '@/utils/index.js'
import { upsertBill } from '@/api/bill.js'
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
      const { account: targetAccount, amount } = await showAccountSelector({
        mode: 'full',
        currentAccount: props.account,
      })
      triggerEvent('transfer', { currentAccount: props.account, targetAccount, type, amount })
    }

    const handleTransferOut = () => handleTransfer(20) // 20 for expense
    const handleTransferIn = () => handleTransfer(10) // 10 for income

    return {
      enableTransfer,
      handleTap,
      handleRename,
      handleTransferOut,
      handleTransferIn,
    }
  },
})
