import { defineComponent, ref } from '@vue-mini/core'
import { showTagsPopup } from '../tags-helper/utils'

defineComponent({
  properties: {
    value: {
      type: String,
      value: '',
    },
  },
  setup(props, { triggetEvent }) {
    const value = ref('')

    async function handleClick() {
      const result = await showTagsPopup()
      value.value = result
    }

    return {
      value,
      handleClick,
    }
  },
})
