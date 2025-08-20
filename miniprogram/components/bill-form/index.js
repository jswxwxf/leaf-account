import { defineComponent, provide } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup(props, { triggerEvent }) {
    const state = store()
    const { setExtra, clearErrors, registerRule, validate } = state
    provide(storeKey, state)

    triggerEvent('init', state)

    return {
      setExtra,
      clearErrors,
      registerRule,
      validate,
    }
  },
})
