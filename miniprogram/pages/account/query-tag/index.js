import { defineComponent } from '@vue-mini/core'
import { showTagsSelector } from '@/utils/helper.js'

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
      value: '请选择要检索的标签',
    },
  },
  setup(props, { triggerEvent }) {
    async function handleClick() {
      const result = await showTagsSelector(props.value, { disableNew: true })
      triggerEvent('change', result)
    }

    return {
      handleClick,
    }
  },
})
