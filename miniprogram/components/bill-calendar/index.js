import { defineComponent, ref, computed, watch } from '@vue-mini/core'
import dayjs from '@/vendor/dayjs/esm/index.js'
import { keyBy } from 'lodash'

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
    firstDayOfWeek: {
      type: Number,
      value: 0, // 0 for Sunday, 1 for Monday
    },
    dailyBills: {
      type: Array,
      value: [],
    },
    month: {
      type: String,
      value: '',
    },
  },
  setup(props, { triggerEvent }) {
    const parseMonth = (monthStr) => {
      if (!monthStr) return dayjs()

      // 如果格式为 YYYY-MM
      if (String(monthStr).includes('-')) {
        return dayjs(`${monthStr}-01`)
      }
      // 如果格式仅为 MM 或 M
      return dayjs().month(Number(monthStr) - 1).startOf('month')
    }

    const currentDate = ref(parseMonth(props.month))

    watch(
      () => props.month,
      (newMonth) => {
        const newDate = parseMonth(newMonth)
        if (newMonth && !newDate.isSame(currentDate.value, 'month')) {
          currentDate.value = newDate
        }
      },
    )

    const currentYear = computed(() => currentDate.value.year())
    const currentMonth = computed(() => currentDate.value.month() + 1)

    const groupedBills = computed(() => {
      const bills = props.dailyBills || {}
      return keyBy(props.dailyBills || [], (bill) => dayjs(bill.datetime).format('YYYY-MM-DD'))
    })

    const weekdays = computed(() => {
      const days = ['日', '一', '二', '三', '四', '五', '六']
      return [...days.slice(props.firstDayOfWeek), ...days.slice(0, props.firstDayOfWeek)]
    })

    const days = computed(() => {
      const date = currentDate.value
      const daysInMonth = date.daysInMonth()
      const firstDayOfMonth = date.startOf('month').day()
      const prevMonthDays = date.subtract(1, 'month').daysInMonth()

      const result = []

      // Calculate the number of days to show from the previous month
      const daysFromPrevMonth = (firstDayOfMonth - props.firstDayOfWeek + 7) % 7

      // Prev month days
      for (let i = 0; i < daysFromPrevMonth; i++) {
        result.push({
          day: prevMonthDays - daysFromPrevMonth + 1 + i,
          isCurrentMonth: false,
        })
      }

      // Current month days
      for (let i = 1; i <= daysInMonth; i++) {
        const currentDay = date.date(i)
        const dayStr = currentDay.format('YYYY-MM-DD')
        const billInfo = groupedBills.value[dayStr] || {}

        result.push({
          day: i,
          isCurrentMonth: true,
          isToday: currentDay.isSame(dayjs(), 'day'),
          isWeekend: [0, 6].includes(currentDay.day()),
          income: billInfo.income,
          expense: billInfo.expense,
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

    const handleMonthChange = (newDate) => {
      currentDate.value = newDate
      triggerEvent('month-change', newDate.format('YYYY-MM'))
    }

    const handlePrevMonth = () => {
      handleMonthChange(currentDate.value.subtract(1, 'month'))
    }

    const handleNextMonth = () => {
      handleMonthChange(currentDate.value.add(1, 'month'))
    }

    return {
      currentYear,
      currentMonth,
      weekdays,
      days,
      handlePrevMonth,
      handleNextMonth,
    }
  },
})
