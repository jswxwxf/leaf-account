import { defineComponent, ref, reactive, computed, provide } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup(props, { selectComponent }) {
    const state = store()
    provide(storeKey, state)

    function handleAddBill() {
      selectComponent('#bill-popup').show({})
    }

    return {
      ...state,
      handleAddBill,
    }
  },
})
