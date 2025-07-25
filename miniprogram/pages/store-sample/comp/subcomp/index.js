import { defineComponent, inject } from '@vue-mini/core'

defineComponent({
  setup() {
    console.log('subcomp initialized')
    const { count, increment } = inject('store')

    function handleTap() {
      increment()
    }

    return { count, handleTap }
  },
})
