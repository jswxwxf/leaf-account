import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { editorPopup } from '@/utils/index.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      editorPopup.value = selectComponent('#editor-popup')
    })

    onDetach(() => {
      editorPopup.value = null
    })
  },
})
