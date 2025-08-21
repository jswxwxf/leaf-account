import { defineComponent, onReady } from '@vue-mini/core'
import { imexportPopup } from '@/utils/helper.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      imexportPopup.value = selectComponent('#imexport-popup')
    })

    onDetach(() => {
      imexportPopup.value = null
    })
  },
})
