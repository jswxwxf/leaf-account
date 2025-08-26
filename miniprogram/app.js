import { createApp, ref } from '@vue-mini/core'
import { envList } from './envList'
import '@/utils/lodash-fix.js'
import '@/app.less'
import { getAccount } from './api/account'

// app.js
createApp({
  globalData: {
    account: ref({
      name: 'leaf-maple',
    }),
    currentTab: ref('account'),
  },
  setup() {
    wx.cloud.init({
      env: envList[0].envId,
      traceUser: true,
    })
  },
  onUnhandledRejection(/* res */) {
    // 捕获未处理的 Promise 异常
    // 在此函数中，可以执行自定义的错误上报逻辑，但不会在控制台打印错误
  },
})
