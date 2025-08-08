import { defineComponent, provide } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    provide(storeKey, store())
  },
})
