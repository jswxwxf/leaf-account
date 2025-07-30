import { defineComponent, onShow, ref } from '@vue-mini/core'
import { showCategoryPopup } from '../category-helper/utils.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '分类',
    },
  },
  setup(props, { selectComponent }) {
    const value = ref('')

    async function handleClick() {
      const result = await showCategoryPopup()
      value.value = result
    }

    return {
      value,
      handleClick,
    }
  },
})
