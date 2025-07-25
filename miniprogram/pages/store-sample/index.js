import { defineComponent, provide } from '@vue-mini/core'
import store from './store'

defineComponent({
  setup() {
    // 页面初始化
    console.log('Page initialized')
    const state = store()
    const { count } = state
    provide('store', state)
    return {
      count,
    }
  },
})
