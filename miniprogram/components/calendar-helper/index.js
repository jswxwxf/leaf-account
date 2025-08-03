import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { calendarPopup } from '@/utils/index.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      // 假设页面中存在 id 为 'calendar-popup' 的组件
      calendarPopup.value = selectComponent('#calendar-popup')
    })

    onDetach(() => {
      calendarPopup.value = null
    })
  },
})
