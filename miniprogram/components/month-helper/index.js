import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { monthSelector } from '@/utils/helper.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      monthSelector.value = selectComponent('#month-selector')
    })

    onDetach(() => {
      monthSelector.value = null
    })
  },
})
