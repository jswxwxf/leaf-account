import { defineComponent, inject } from '@vue-mini/core'

defineComponent({
  setup() {
    console.log('comp initialized')
    const { count } = inject('store')
    return { count }
  },
})
