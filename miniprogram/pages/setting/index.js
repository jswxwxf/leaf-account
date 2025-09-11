import { defineComponent, onTabItemTap, onShareAppMessage, ref, onReady } from '@vue-mini/core'
import Dialog from '@vant/weapp/dialog/dialog'
import { resetBills } from '@/api/bill.js'
import { postFeedback } from '@/api/feedback.js'

defineComponent({
  setup() {
    const feedbackPopup = ref(null)

    onReady(() => {
      feedbackPopup.value = getCurrentPages().pop().selectComponent('#feedback-popup')
    })

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

        getApp().globalData.account.value = {
          name: 'leaf-maple',
        }
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

    const handleFeedback = async () => {
      try {
        const content = await feedbackPopup.value.show('', {
          placeholder: '请输入您的反馈或建议...',
          confirmText: '提交',
        })
        await postFeedback(content)
        Dialog.alert({
          title: '提交成功',
          message: '感谢您的反馈，我们会尽快处理！',
        })
      } finally {
        wx.hideLoading()
      }
    }

    onTabItemTap(() => {
      getApp().globalData.currentTab.value = 'setting'
    })

    onShareAppMessage(() => {
      return {
        title: '小枫记账，识图记账小程序',
        path: '/pages/account/index',
        imageUrl: '/assets/images/share.jpg',
      }
    })

    return {
      handleReset,
      handleCategory,
      handleTag,
      handleFeedback,
    }
  },
})
