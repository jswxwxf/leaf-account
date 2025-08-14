import { defineComponent, inject, ref } from '@vue-mini/core'
import { storeKey } from '../store'

defineComponent({
  properties: {
    hidden: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent }) {
    const {
      currentAccount,
      typeValue,
      monthValue,
      totalExpense,
      totalIncome,
      totalBalance,
      searchText,
      updateSearchText,
    } = inject(storeKey)

    const typeOptions = ref([
      { text: '全部', value: '' },
      { text: '支出', value: '20' },
      { text: '收入', value: '10' },
    ])

    const generateMonthOptions = () => {
      const options = [{ text: '全部', value: '' }]
      const current = new Date()
      for (let i = 0; i < 120; i++) {
        const date = new Date(current.getFullYear(), current.getMonth() - i, 1)
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        options.push({
          text: `${year}年${month}月`,
          value: `${year}-${month}`,
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

    const onBalanceTap = () => {
      triggerEvent('balance-tap')
    }

    return {
      currentAccount,
      typeOptions,
      monthOptions,
      typeValue,
      monthValue,
      totalExpense,
      totalIncome,
      totalBalance,
      handleDateChange,
      handleTypeChange,
      onBalanceTap,
      searchText,
      updateSearchText,
    }
  },
})
