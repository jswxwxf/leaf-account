import { defineComponent, nextTick, ref } from '@vue-mini/core'

defineComponent({
  properties: {
    imagePath: {
      type: String,
      default: '',
    },
    textContent: {
      type: String,
      default: '',
    },
  },
  setup() {
    const isFolded = ref(false)
    const isHidden = ref(false)

    const toggleFold = () => {
      isFolded.value = !isFolded.value
    }

    return {
      isFolded,
      isHidden,
      toggleFold,
    }
  },
})
