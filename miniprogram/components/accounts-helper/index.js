import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { accountsSelector } from '@/utils/helper.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      accountsSelector.value = selectComponent('#accounts-selector')
    })

    onDetach(() => {
      accountsSelector.value = null
    })
  },
})
