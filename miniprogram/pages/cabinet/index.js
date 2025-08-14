import { defineComponent, ref, onShow } from '@vue-mini/core'
import { getAccounts } from '@/api/account.js'

defineComponent({
  setup() {
    const accounts = ref([])

    const fetchAccounts = async () => {
      const res = await getAccounts()
      accounts.value = res.data
    }

    const handleAccountTap = (e) => {
      const account = e.detail
      wx.setTabBarItem({
        index: 0,
        text: account.title, // 修改后的文字
      })
      getApp().globalData.account.value = account
      wx.switchTab({
        url: `/pages/account/index`,
      })
    }

    fetchAccounts()

    onShow(() => {
      fetchAccounts()
    })

    return {
      accounts,
      handleAccountTap,
    }
  },
})
