import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import { storeKey } from '../store'
import { onTabChange } from '@/utils/index.js'
import { getAccountMonths } from '@/service/account-service.js'

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

    const monthOptions = ref([{ text: '全部', value: '' }])

    watch(
      currentAccount,
      async (newAccount) => {
        if (newAccount && newAccount._id) {
          try {
            const months = await getAccountMonths(newAccount._id)
            const options = months.map((month) => ({
              text: `${month.slice(0, 4)}年${month.slice(5)}月`,
              value: month,
            }))
            monthOptions.value = [{ text: '全部', value: '' }, ...options]
          } catch (error) {
            console.error('获取账本月份失败:', error)
            monthOptions.value = [{ text: '全部', value: '' }]
          }
        }
      },
      { immediate: true },
    )

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
