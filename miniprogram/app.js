import { createApp } from '@vue-mini/core'
import '@/utils/lodash-fix.js'
import '@/app.wxss'

// app.js
createApp({
  setup() {},
  onUnhandledRejection(/* res */) {
    // 捕获未处理的 Promise 异常
    // 在此函数中，可以执行自定义的错误上报逻辑，但不会在控制台打印错误
  },
})
