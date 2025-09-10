import { defineComponent, ref, computed } from '@vue-mini/core'
import dayjs from '@/vendor/dayjs/esm/index.js'

defineComponent({
  properties: {
    showHeader: {
      type: Boolean,
      value: true,
    },
    nextMonthHint: {
      type: Boolean,
      value: false,
    },
  },
  setup(props) {
    const currentDate = ref(dayjs())

    const year = computed(() => currentDate.value.year())
    const month = computed(() => currentDate.value.month() + 1)

    const days = computed(() => {
      const date = currentDate.value
      const daysInMonth = date.daysInMonth()
      const firstDayOfMonth = date.startOf('month').day()
      const prevMonthDays = date.subtract(1, 'month').daysInMonth()

      const result = []

      // Prev month days
      for (let i = 0; i < firstDayOfMonth; i++) {
        result.push({
          day: prevMonthDays - firstDayOfMonth + 1 + i,
          isCurrentMonth: false,
        })
      }

      // Current month days
      for (let i = 1; i <= daysInMonth; i++) {
        result.push({
          day: i,
          isCurrentMonth: true,
          isToday: date.date(i).isSame(dayjs(), 'day'),
        })
      }

      // Next month days
      if (props.nextMonthHint) {
        const remaining = 42 - result.length
        for (let i = 1; i <= remaining; i++) {
          result.push({
            day: i,
            isCurrentMonth: false,
          })
        }
      }

      return result
    })

    const handlePrevMonth = () => {
      currentDate.value = currentDate.value.subtract(1, 'month')
    }

    const handleNextMonth = () => {
      currentDate.value = currentDate.value.add(1, 'month')
    }

    return {
      year,
      month,
      days,
      handlePrevMonth,
      handleNextMonth,
    }
  },
})
