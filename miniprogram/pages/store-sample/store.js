import { ref } from '@vue-mini/core'

export default function store() {
  const count = ref(0)

  function increment() {
    count.value++
  }

  return {
    count,
    increment,
  }
}
