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
    async function handleClick() {
      const result = await showTagsPopup(props.value)
      triggerEvent('change', result)
    }

    return {
      handleClick,
    }
  },
})
