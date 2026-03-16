import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import dayjs from 'dayjs'
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
      queryData,
      setQuery,
      clearQuery,
      monthValue,
      totalExpense,
      totalIncome,
      totalBalance,
      queryDropDownClosed,
      hasQueryData,
    } = inject(storeKey)

    const searchText = ref('')

    const updateSearchText = (e) => {
      searchText.value = e.detail
    }

    watch(
      () => queryData.value.note,
      (newNote) => {
        const val = newNote || ''
        if (searchText.value !== val) {
          searchText.value = val
        }
      },
    )

    const typeOptions = ref([
      { text: '全部', value: '' },
      { text: '支出', value: '20' },
      { text: '收入', value: '10' },
    ])

    const now = dayjs()
    const currentMonth = now.format('YYYY-MM')
    const monthOptions = ref([
      { text: '全部', value: '' },
      { text: now.format('YYYY年MM月'), value: now.format('YYYY-MM') },
    ])

    watch(
      currentAccount,
      async (newAccount) => {
        if (newAccount && newAccount._id) {
          const months = await getAccountMonths(newAccount._id)
          const options = months.map((timestamp) => {
            const date = dayjs(timestamp)
            return {
              text: date.format('YYYY年MM月'),
              value: date.format('YYYY-MM'),
            }
          })
          monthOptions.value = [{ text: '全部', value: '' }, ...options]
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

    function resetQueryData() {
      selectComponent('#query-cell').resetQueryData()
    }

    // 更新 handleSearch 逻辑以使用本地 searchText 并修改全局 queryData
    const handleSearch = () => {
      const keyword = searchText.value.trim()
      if (!keyword) return

      // 所有条件置空，只保留备注
      setQuery({ note: keyword })
      // 日期置为空
      monthValue.value = ''
    }

    // 更新 handleClearSearch 重置查询条件
    const handleClearSearch = () => {
      handleClearQuery()
      handleResetMonth()
    }

    const handleClearQuery = () => {
      searchText.value = ''
      clearQuery()
    }

    const handleResetMonth = () => {
      monthValue.value = currentMonth
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
      hasQueryData,
      handleDateChange,
      handleClearQuery,
      handleResetMonth,
      handleClearSearch,
      handleSearch,
      onBalanceTap,
      searchText,
      updateSearchText,
      resetQueryData,
    }
  },
})
