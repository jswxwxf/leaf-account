import { defineComponent, ref, reactive, computed, provide, onReady } from '@vue-mini/core'
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
        await billPopup.show({})
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
