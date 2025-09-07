import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import { storeKey } from '../store'
import { onTabChange } from '@/utils/index.js'

defineComponent({
  properties: {
    hidden: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent, selectComponent }) {
    const {
      currentAccount,
      monthValue,
      totalExpense,
      totalIncome,
      totalBalance,
      queryDropDownClosed,
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
      const year = current.getFullYear()
      const currentMonth = current.getMonth() + 1
      for (let i = currentMonth; i >= 1; i--) {
        const month = i.toString().padStart(2, '0')
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

    const onBalanceTap = () => {
      triggerEvent('balance-tap')
    }

    function clearQueryData() {
      selectComponent('#query-cell').clearQueryData()
    }

    watch(queryDropDownClosed, () => {
      selectComponent('#query-dropdown').toggle(false)
    })

    onTabChange(() => {
      selectComponent('#query-dropdown').toggle(false)
      selectComponent('#month-dropdown').toggle(false)
    })

    return {
      currentAccount,
      typeOptions,
      monthOptions,
      monthValue,
      totalExpense,
      totalIncome,
      totalBalance,
      handleDateChange,
      onBalanceTap,
      searchText,
      updateSearchText,
      clearQueryData,
    }
  },
})
