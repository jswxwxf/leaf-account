import { defineComponent, provide } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    const state = store()
    const { registerRule, validate } = state
    provide(storeKey, state)

    return {
      registerRule,
      validate,
    }
  },
})
