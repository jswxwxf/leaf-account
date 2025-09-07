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
    type: {
      type: String,
      value: 'primary', // primary, info, warning, danger
    },
    rounded: {
      type: Boolean,
      value: false,
    },
    size: {
      type: String,
      value: 'medium', // mini, small, medium, large
    },
  },

  setup(props, { triggerEvent }) {
    provide(storeKey, store(props, { triggerEvent }))
  },
})
