import { defineComponent, ref, provide, watch } from '@vue-mini/core'
import store, { storeKey } from './store'

export default defineComponent({
  properties: {
    value: {
      type: [String, Number, Array],
      value: '',
    },
    multiple: {
      type: Boolean,
      value: false,
    },
  },

  setup(props, { triggerEvent }) {
    provide(storeKey, store(props, { triggerEvent }))
  },
})
