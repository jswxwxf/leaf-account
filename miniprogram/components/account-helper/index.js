import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { accountSelector } from '@/utils/index.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      accountSelector.value = selectComponent('#account-selector')
    })

    onDetach(() => {
      accountSelector.value = null
    })
  },
})
