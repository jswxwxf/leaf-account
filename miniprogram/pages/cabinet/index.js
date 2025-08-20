import { defineComponent, ref, onShow, onReady, provide } from '@vue-mini/core'
import Dialog from '@vant/weapp/dialog/dialog.js'
import { getAccount, getAccounts, updateAccount, deactivateAccount } from '@/api/account.js'
import { saveTransfer } from '@/api/bill.js'
import store, { storeKey } from './store'

defineComponent({
  setup(props, { selectComponent }) {
    const state = store()
    provide(storeKey, state)
    const { accounts, fetchAccounts } = state

    const accountPopup = ref(null)

    onReady(() => {
      accountPopup.value = selectComponent('#account-popup')
    })

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

    const handleDeactivate = async (e) => {
      const { index } = e.currentTarget.dataset
      const account = e.detail

      await Dialog.confirm({
        title: '确认停用',
        message: `确定要停用账本「${account.title}」吗？\n所有关联的账单都将被删除且无法恢复。`,
        confirmButtonColor: '#fa5151',
      })
      await deactivateAccount(account._id)
      wx.showToast({ title: '账本已删除', icon: 'success' })
      // 重新获取账本列表
      fetchAccounts()
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

    const handleTransfer = async (e) => {
      const { currentAccount, targetAccount, type, amount } = e.detail
      await saveTransfer({ targetAccount, type, amount }, { accountId: currentAccount._id })
      wx.showToast({ title: '转账成功', icon: 'success' })
      // 重新获取账本列表，更新余额
      fetchAccounts()
    }

    return {
      accounts,
      handleActivate,
      handleDeactivate,
      handleRename,
      handleTransfer,
    }
  },
})
