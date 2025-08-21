import { defineComponent, onDetach, onReady } from '@vue-mini/core'
import { calendarSelector } from '@/utils/helper.js'

defineComponent({
  setup(props, { selectComponent }) {
    onReady(() => {
      // 假设页面中存在 id 为 'calendar-selector' 的组件
      calendarSelector.value = selectComponent('#calendar-selector')
    })

    onDetach(() => {
      calendarSelector.value = null
    })
  },
})
