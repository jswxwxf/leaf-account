import { defineComponent, ref, reactive, computed, provide } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    const state = store()
    provide(storeKey, state)
    return state
  },
})
