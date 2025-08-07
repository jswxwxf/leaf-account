import { defineComponent, ref } from '@vue-mini/core'
import { showTagsPopup } from '@/utils/index.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '标签',
    },
    value: {
      type: Array,
      value: [],
    },
    placeholder: {
      type: String,
      value: '请选择标签',
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
