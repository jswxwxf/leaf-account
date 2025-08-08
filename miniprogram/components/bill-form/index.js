import { defineComponent, provide } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    const state = store()
    const { clearErrors, registerRule, validate } = state
    provide(storeKey, state)

    return {
      clearErrors,
      registerRule,
      validate,
    }
  },
})
