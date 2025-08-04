import { defineComponent, inject, ref } from '@vue-mini/core'
import { storeKey } from '../store'
import { DateTime } from '@/utils/date.js'

defineComponent({
  properties: {
    hidden: {
      type: Boolean,
      value: false,
    },
  },
  setup() {
    const { typeValue, dateValue, totalExpense, totalIncome } = inject(storeKey)

    const typeOptions = ref([
      { text: '全部类型', value: 0 },
      { text: '支出', value: 20 },
      { text: '收入', value: 10 },
    ])

    const generateDateOptions = () => {
      const options = []
      const current = DateTime.now()
      for (let i = 0; i < 120; i++) {
        const date = current.minus({ months: i })
        options.push({
          text: date.toFormat('yyyy年MM月'),
          value: date.endOf('month').toFormat('yyyy-MM-dd'),
        })
      }
      return options
    }
    const dateOptions = ref(generateDateOptions())

    const handleDateChange = (e) => {
      dateValue.value = e.detail
      console.log(dateValue.value)
    }

    return {
      typeOptions,
      dateOptions,
      typeValue,
      dateValue,
      totalExpense,
      totalIncome,
      handleDateChange,
    }
  },
})
