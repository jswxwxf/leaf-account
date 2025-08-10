import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { tagsSelector } from '@/utils/index.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      tagsSelector.value = selectComponent('#tags-selector')
    })

    onDetach(() => {
      tagsSelector.value = null
    })
  },
})
