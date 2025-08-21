import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { categorySelector } from '@/utils/helper.js'

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
