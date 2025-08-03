import { defineComponent, ref, computed } from '@vue-mini/core'
import { formatDate } from '@/utils/date.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '日期',
    },
    value: {
      type: Date,
      value: new Date(),
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
    const show = ref(false)

    // 限制可选范围为最近五年
    const minDate = new Date(new Date().getFullYear() - 5, 0, 1).getTime()
    const maxDate = new Date().getTime()

    const formattedDate = computed(() => {
      const format = props.type === 'short' ? 'MM-dd' : 'yyyy-MM-dd'
      return formatDate(props.value, format)
    })

    const showCalendar = () => {
      show.value = true
    }

    const hideCalendar = () => {
      show.value = false
    }

    const handleConfirm = (event) => {
      const selectedDate = event.detail
      triggerEvent('change', selectedDate.getTime())
      hideCalendar()
    }

    return {
      show,
      minDate,
      maxDate,
      formattedDate,
      showCalendar,
      hideCalendar,
      handleConfirm,
    }
  },
})
