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
    const { typeValue, monthValue, totalExpense, totalIncome, totalBalance } = inject(storeKey)

    const typeOptions = ref([
      { text: '全部', value: '' },
      { text: '支出', value: '20' },
      { text: '收入', value: '10' },
    ])

    const generateMonthOptions = () => {
      const options = [{ text: '全部', value: '' }]
      const current = DateTime.now()
      for (let i = 0; i < 120; i++) {
        const date = current.minus({ months: i })
        options.push({
          text: date.toFormat('yyyy年MM月'),
          value: date.endOf('month').toFormat('yyyy-MM'),
        })
      }
      return options
    }
    const monthOptions = ref(generateMonthOptions())

    const handleDateChange = (e) => {
      monthValue.value = e.detail
    }

    const handleTypeChange = (e) => {
      typeValue.value = e.detail
    }

    return {
      typeOptions,
      monthOptions,
      typeValue,
      monthValue,
      totalExpense,
      totalIncome,
      totalBalance,
      handleDateChange,
      handleTypeChange,
    }
  },
})
