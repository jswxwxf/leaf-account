import { defineComponent, ref, onShow, onReady } from '@vue-mini/core'
import { getAccounts, updateAccount } from '@/api/account.js'

defineComponent({
  setup(props, { selectComponent }) {
    const accountPopup = ref(null)
    const accounts = ref([])

    onReady(() => {
      accountPopup.value = selectComponent('#account-popup')
    })

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

    const handleRename = async (e) => {
      const { index } = e.currentTarget.dataset
      const oldAccount = e.detail
      const newAccount = await accountPopup.value.show(oldAccount)

      // 如果名称没有改变，则不执行任何操作
      if (newAccount.title.trim() === oldAccount.title.trim()) {
        return
      }

      // 后端更新
      const { data: updatedAccount } = await updateAccount(newAccount._id, { title: newAccount.title })
      // 前端视图更新
      accounts.value[index].title = updatedAccount.title
      wx.showToast({
        title: '修改成功',
        icon: 'success',
      })
    }

    fetchAccounts()

    onShow(() => {
      fetchAccounts()
    })

    return {
      accounts,
      handleAccountTap,
      handleRename,
    }
  },
})
