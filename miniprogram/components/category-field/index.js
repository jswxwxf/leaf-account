import { defineComponent, ref } from '@vue-mini/core'
import { showCategoryPopup } from '@/utils/index.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '分类',
    },
    value: {
      type: Object,
      value: {},
    },
  },
  setup(props, { triggerEvent }) {
    async function handleClick() {
      const result = await showCategoryPopup()
      triggerEvent('change', result)
    }

    return {
      handleClick,
    }
  },
})
