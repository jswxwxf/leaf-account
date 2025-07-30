import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { categoryPopup } from './utils'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      categoryPopup.value = selectComponent('#category-popup')
    })

    onDetach(() => {
      categoryPopup.value = null
    })
  },
})
