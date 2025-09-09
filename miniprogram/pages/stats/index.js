import { defineComponent, onTabItemTap, provide, computed, ref } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    const state = store()
    provide(storeKey, state)
    const { availableAccounts, selectedAccounts, dimension, checkedValue, monthValue, groupedBills } = state

    const totals = computed(() => {
      return availableAccounts.value.reduce(
        (acc, account) => {
          acc.expense += Number(account.totalExpense)
          acc.income += Number(account.totalIncome)
          acc.balance += Number(account.balance)
          return acc
        },
        { expense: 0, income: 0, balance: 0 },
      )
    })

    const filterAmount = computed(() => {
      return groupedBills.value.reduce((acc, bill) => acc + Number(bill.totalAmount), 0)
    })

    onTabItemTap(() => {
      getApp().globalData.currentTab.value = 'stats'
    })

    const onItemTap = (e) => {
      if (selectedAccounts.value.length > 1) return
      // 如果只选中一个账本，点击可以跳到对应的帐本明细
      let account = selectedAccounts.value[0]
      let category
      let month = monthValue.value ? `${new Date().getFullYear()}-${monthValue.value}` : ''
      let exclude = checkedValue.value.includes('exclude')
      if (dimension.value === 'category') {
        category = e.detail.groupInfo
      } else {
        // 当按月份分组时，e.detail._id 就是 'YYYY-MM' 格式的字符串
        month = e.detail._id
      }
      wx.setTabBarItem({
        index: 0,
        text: account.title,
      })
      getApp().globalData.account.value = account
      getApp().globalData.query.value = {
        category,
        month,
        exclude,
      }
      wx.switchTab({
        url: `/pages/account/index`,
      })
    }

    return {
      ...state,
      availableAccounts,
      totals,
      filterAmount,
      onItemTap,
    }
  },
})
