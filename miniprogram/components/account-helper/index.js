import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { accountSelector } from '@/utils/helper.js'

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
