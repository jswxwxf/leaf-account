import { defineComponent, ref, reactive, computed, provide, onReady } from '@vue-mini/core'
import { newBill } from '@/service/bill-service.js'
import { upsertBill } from '@/api/bill.js'
import store, { storeKey } from './store'

function useBillPopup(state, billPopupRef) {
  const billPopped = ref(false)

  const processBill = async (initialBill) => {
    if (!billPopupRef.value) return

    billPopped.value = true
    let billToUpsert = null

    try {
      billToUpsert = await billPopupRef.value.show(initialBill)
    } finally {
      billPopped.value = false
    }

    if (billToUpsert) {
      const res = await upsertBill(billToUpsert)
      if (res.data) {
        state.updateRawBill(res.data)
      }
    }
  }

  return {
    billPopped,
    processBill,
  }
}

defineComponent({
  setup(props, { selectComponent }) {
    const state = store()
    provide(storeKey, state)

    const billPopup = ref(null)

    onReady(() => {
      billPopup.value = selectComponent('#bill-popup')
    })

    const { billPopped, processBill } = useBillPopup(state, billPopup)

    const handleAddBill = () => {
      processBill(newBill())
    }

    const handleEditBill = (e) => {
      processBill(e.detail)
    }

    return {
      ...state,
      billPopped,
      handleAddBill,
      handleEditBill,
    }
  },
})
