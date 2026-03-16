import { defineComponent, ref } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'

defineComponent({
  setup(props, { selectComponent }) {
    const visible = ref(false) // 内部状态变量
    const minDate = new Date(new Date().getFullYear() - 5, 0, 1).getTime()
    const maxDate = new Date().getTime()
    const defaultDate = ref(new Date().getTime())

    let _resolve
    let _reject

    onTabChange(() => {
      onClose()
    })

    // 暴露给外部调用的方法
    const show = (currentDate) => {
      defaultDate.value = currentDate || new Date().getTime()
      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const hide = () => {
      visible.value = false
    }

    const onConfirm = (event) => {
      _resolve(event.detail.getTime())
      hide()
    }

    const onClose = () => {
      _reject && _reject(new Error('用户取消选择'))
      hide()
    }

    const selectToday = () => {
      _resolve(Date.now())
      hide()
    }

    return {
      visible, // WXML 中需要绑定 visible
      minDate,
      maxDate,
      defaultDate,
      show, // 暴露 show 方法
      onClose,
      onConfirm,
      selectToday,
    }
  },
})
