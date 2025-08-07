import { defineComponent, ref, computed } from '@vue-mini/core'
import { formatDate } from '@/utils/date.js'
import { showCalendar } from '@/utils/index.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '日期',
    },
    value: {
      type: [Number, Date], // Allow both timestamp and Date object
      value: Date.now(),
    },
    type: {
      type: String,
      value: 'long', // 'long' or 'short'
    },
    placeholder: {
      type: String,
      value: '请选择日期',
    },
  },

  setup(props, { triggerEvent }) {
    const formattedDate = computed(() => {
      if (!props.value) return ''
      const format = props.type === 'short' ? 'MM月DD日' : 'YYYY-MM-DD'
      return formatDate(props.value, format)
    })

    const handleClick = async () => {
      const result = await showCalendar(props.value)
      triggerEvent('change', result)
    }

    return {
      formattedDate,
      handleClick,
    }
  },
})
