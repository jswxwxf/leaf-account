import { defineComponent, onTabItemTap, provide, computed, ref } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    const state = store()
    provide(storeKey, state)
    const {
      availableAccounts,
      selectedAccounts,
      dimension,
      checkedValue,
      monthValue,
      groupedBills,
    } = state

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

    const onAccountTap = (e) => {
      const account = e.detail
      wx.setTabBarItem({
        index: 0,
        text: account.title,
      })
      getApp().globalData.account.value = account
      getApp().globalData.query.value = {
        month: '',
        exclude: true,
      }
      wx.switchTab({
        url: `/pages/account/index`,
      })
    }

    function extractMonth(str) {
      if (!str || str === '全部') return ''
      // 处理 2024年03月 或 2024-03 转化为 2024-03
      return str.replace('年', '-').replace('月', '')
    }

    const onItemTap = (e) => {
      if (selectedAccounts.value.length > 1) return
      // 如果只选中一个账本，点击可以跳到对应的帐本明细
      let account = selectedAccounts.value[0]
      let category
      let month = ''
      let exclude = checkedValue.value.includes('exclude')

      if (dimension.value === 'category') {
        category = e.detail.groupInfo
        month = extractMonth(monthValue.value)
      } else {
        // 当按月份分组时，e.detail._id 就是原始 ID
        month = extractMonth(e.detail._id)
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
      onAccountTap,
      onItemTap,
    }
  },
})
