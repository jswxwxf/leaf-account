import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { transferPopup } from '@/utils/helper.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      transferPopup.value = selectComponent('#transfer-popup')
    })

    onDetach(() => {
      transferPopup.value = null
    })
  },
})
