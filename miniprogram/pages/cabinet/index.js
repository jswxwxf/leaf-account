import { defineComponent, ref, onShow, onReady } from '@vue-mini/core'
import { getAccount, getAccounts, updateAccount } from '@/api/account.js'

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

    const doUpdateAccount = async (oldAccount, dataToUpdate, index) => {
      // 如果名称没有改变，则不执行任何操作
      if (dataToUpdate.title.trim() === oldAccount.title.trim()) {
        return dataToUpdate
      }
      const { data: updatedAccount } = await updateAccount(oldAccount._id, dataToUpdate)
      accounts.value[index].title = updatedAccount.title
      accounts.value[index].isOpened = updatedAccount.isOpened
      return updatedAccount
    }

    const handleActivate = async (e) => {
      const { index } = e.currentTarget.dataset
      let account = e.detail

      if (!account.isOpened) {
        // 弹窗让用户确认启用
        const confirmedAccount = await accountPopup.value.show(account, {
          title: '启用新账本',
          confirmButtonText: '启用',
        })
        const res = await getAccount(account.name)
        account = await doUpdateAccount(
          res.data,
          {
            ...res.data,
            isOpened: true,
            title: confirmedAccount.title,
          },
          index,
        )
        wx.showToast({ title: '账本已启用', icon: 'success' })
      }

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
      const newAccountInfo = await accountPopup.value.show(oldAccount)
      await doUpdateAccount(oldAccount, { title: newAccountInfo.title }, index)
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
      handleActivate,
      handleRename,
    }
  },
})
