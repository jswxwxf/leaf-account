import { defineComponent, ref, computed } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'

const generateMonths = () => {
  const months = []
  for (let i = 1; i <= 12; i++) {
    const month = i.toString().padStart(2, '0')
    months.push(month)
  }
  return months
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const months = generateMonths()
    const selectedMonth = ref(null)
    const options = ref({})

    let _resolve, _reject

    onTabChange(() => {
      handleClose()
    })

    const show = (value, opts = {}) => {
      options.value = opts
      visible.value = true
      // 单选模式，value 现在是字符串
      selectedMonth.value = value || null
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const hide = () => {
      visible.value = false
    }

    const handleClose = () => {
      hide()
      _reject && _reject(new Error('用户取消'))
    }

    const handleSelect = (event) => {
      const { item } = event.currentTarget.dataset
      hide()
      _resolve(item)
    }

    return {
      visible,
      months,
      options,
      selectedMonth,
      show,
      handleClose,
      handleSelect,
    }
  },
})
