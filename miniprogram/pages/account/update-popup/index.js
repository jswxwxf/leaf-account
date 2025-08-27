import { defineComponent, inject, nextTick, ref } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'
import { storeKey } from '../store'

defineComponent({
  setup() {
    const { searchText, updateSearchText, notes, clearBatchCheck, batchAllChecked, batchCheckAll } =
      inject(storeKey)
    const visible = ref(false)

    let _resolve, _reject

    // 当切换 Tab 时，自动关闭弹窗
    onTabChange((newTab) => {
      if (newTab !== 'account') {
        handleClose()
      }
    })

    const show = () => {
      clearBatchCheck()
      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const handleClose = () => {
      _reject && _reject(new Error('用户取消'))
      visible.value = false
    }

    const handleConfirm = async () => {
      // 批量更新逻辑待实现
      _resolve && _resolve()
      visible.value = false
    }

    return {
      visible,
      searchText,
      batchAllChecked,
      show,
      handleClose,
      handleConfirm,
      updateSearchText,
      batchCheckAll,
    }
  },
})
