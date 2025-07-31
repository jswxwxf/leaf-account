import { defineComponent, ref } from '@vue-mini/core'
import { showTagsPopup } from '@/utils/index.js'

defineComponent({
  properties: {
    value: {
      type: Array,
      value: [],
    },
  },
  setup(props, { triggerEvent }) {
    const value = ref([])

    async function handleClick() {
      const result = await showTagsPopup(value.value)
      value.value = result
      triggerEvent('change', result)
    }

    return {
      value,
      handleClick,
    }
  },
})
