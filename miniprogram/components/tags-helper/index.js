import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { tagsPopup } from '@/utils/index.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      tagsPopup.value = selectComponent('#tags-popup')
    })

    onDetach(() => {
      tagsPopup.value = null
    })
  },
})
