import { defineComponent } from '@vue-mini/core'
import Dialog from '@vant/weapp/dialog/dialog'
import { resetBills } from '@/api/bill.js'

defineComponent({
  setup() {
    const handleReset = async () => {
      try {
        await Dialog.confirm({
          title: '确认清空帐目',
          message: '此操作将清空所有记账数据，并无法恢复。确定要重新开始吗？',
          confirmButtonText: '确认清空',
          confirmButtonColor: '#ee0a24',
        })

        wx.showLoading({ title: '正在清空...' })
        const res = await resetBills()
        wx.hideLoading()

        await Dialog.alert({
          title: '操作成功',
          message: res.message,
        })
        wx.reLaunch({
          url: '/pages/account/index',
        })
      } finally {
        wx.hideLoading()
      }
    }

    const handleCategory = () => {
      wx.navigateTo({
        url: '/pages/category/index',
      })
    }

    const handleTag = () => {
      wx.navigateTo({
        url: '/pages/tag/index',
      })
    }

    return {
      handleReset,
      handleCategory,
      handleTag,
    }
  },
})
