import { defineComponent } from '@vue-mini/core'
import { showCategorySelector } from '@/utils/helper.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '分类',
    },
    value: {
      type: Array,
      value: [],
    },
    placeholder: {
      type: String,
      value: '请选择要检索的分类',
    },
  },
  setup(props, { triggerEvent }) {
    async function handleClick() {
      const result = await showCategorySelector(props.value, {
        disableNew: true,
        disableTransferAccount: true,
        allowMultiple: true,
      })
      triggerEvent('change', result)
    }

    return {
      handleClick,
    }
  },
})
