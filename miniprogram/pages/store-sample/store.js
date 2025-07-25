import { ref } from '@vue-mini/core'

export default function store() {
  const state = ref({
    count: 0,
  })

  function increment() {
    state.value.count++
  }

  return {
    state,
    increment,
  }
}

export const storeKey = Symbol('store-key')
