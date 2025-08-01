import { defineComponent, ref } from '@vue-mini/core'
import { showCategoryPopup } from '@/utils/index.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '分类',
    },
  },
  setup(props, { triggerEvent }) {
    const value = ref('')

    async function handleClick() {
      const result = await showCategoryPopup()
      value.value = result
      triggerEvent('change', result)
    }

    return {
      value,
      handleClick,
    }
  },
})
