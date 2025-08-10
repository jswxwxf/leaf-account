import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { categorySelector } from '@/utils/index.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      categorySelector.value = selectComponent('#category-selector')
    })

    onDetach(() => {
      categorySelector.value = null
    })
  },
})
