import { defineComponent, provide } from '@vue-mini/core'
import store, { storeKey } from './store'

defineComponent({
  setup() {
    // 页面初始化
    console.log('Page initialized')
    const _store = store()
    const { state } = _store
    provide(storeKey, _store)
    return { state }
  },
})
