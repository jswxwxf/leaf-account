import { defineComponent, ref, reactive, computed, provide, onReady } from '@vue-mini/core'
import { newBill } from '@/service/bill-service.js'
import { upsertBill } from '@/api/bill.js'
import store, { storeKey } from './store'

defineComponent({
  setup(props, { selectComponent }) {
    const state = store()
    provide(storeKey, state)

    const billPopped = ref(false)
    let billPopup

    onReady(() => {
      billPopup = selectComponent('#bill-popup')
    })

    async function handleAddBill() {
      billPopped.value = true
      try {
        const bill = await billPopup.show(newBill())
        await upsertBill(bill)
      } finally {
        setTimeout(() => {
          billPopped.value = false
        }, 300)
      }
    }

    return {
      ...state,
      billPopped,
      handleAddBill,
    }
  },
})
