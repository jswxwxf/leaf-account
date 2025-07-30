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
  },

  setup(props, { triggerEvent }) {
    const show = ref(false)

    // 限制可选范围为最近五年
    const minDate = new Date(new Date().getFullYear() - 5, 0, 1).getTime()
    const maxDate = new Date().getTime()

    const formattedDate = computed(() => {
      return formatDate(props.value, 'yyyy-MM-dd')
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
