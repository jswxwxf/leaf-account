import { defineComponent, onPullDownRefresh } from '@vue-mini/core'

defineComponent({
  setup(props, { selectComponent }) {
    onPullDownRefresh(async () => {
      const stats = selectComponent('#index')
      await Promise.all([stats.fetchAccounts(), stats.fetchGroupedBills()])
      wx.stopPullDownRefresh()
    })
  },
})
