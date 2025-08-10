import { defineComponent } from '@vue-mini/core'
import Dialog from '@vant/weapp/dialog/dialog'

defineComponent({
  setup() {
    const handleReset = () => {
      Dialog.confirm({
        title: '确认清空帐目',
        message: '此操作将清空所有记账数据，并无法恢复。确定要重新开始吗？',
        confirmButtonText: '确认清空',
        confirmButtonColor: '#ee0a24',
      })
        .then(() => {
          console.log('User confirmed to reset account book.')
          // 在这里添加清空数据的逻辑
        })
        .catch(() => {
          // on cancel
        })
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
