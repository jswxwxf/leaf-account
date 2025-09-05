import { defineComponent, onTabItemTap, provide, computed } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    const state = store()
    provide(storeKey, state)
    const { openedAccounts } = state

    const totals = computed(() => {
      return openedAccounts.value.reduce(
        (acc, account) => {
          acc.expense += Number(account.totalExpense)
          acc.income += Number(account.totalIncome)
          acc.balance += Number(account.balance)
          return acc
        },
        { expense: 0, income: 0, balance: 0 },
      )
    })

    onTabItemTap(() => {
      getApp().globalData.currentTab.value = 'stats'
    })

    return {
      openedAccounts,
      totals,
    }
  },
})
