import { defineComponent, inject } from '@vue-mini/core'
import { storeKey } from '../../store'

defineComponent({
  setup() {
    console.log('subcomp initialized')
    const { state, increment } = inject(storeKey)

    function handleTap() {
      increment()
    }

    return { state, handleTap }
  },
})
