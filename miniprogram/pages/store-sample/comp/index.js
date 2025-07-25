import { defineComponent, inject } from '@vue-mini/core'
import { storeKey } from '../store'

defineComponent({
  setup() {
    console.log('comp initialized')
    const { state } = inject(storeKey)
    return { state }
  },
})
