import { defineComponent, ref } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'
import { getAllMonths } from '@/service/account-service.js'
import dayjs from 'dayjs'

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const months = ref([dayjs().format('YYYY年MM月')])
    const selectedMonth = ref(null)
    const options = ref({})

    let _resolve, _reject

    onTabChange(() => {
      handleClose()
    })

    const show = async (value, opts = {}) => {
      options.value = opts
      // 单选模式，value 现在是字符串
      selectedMonth.value = value || null

      // 加载月份列表，如果失败会保持初始默认值
      const result = await getAllMonths()
      if (result) {
        months.value = result
      }

      visible.value = true

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

    const onSelectAllYear = () => {
      hide()
      _resolve('')
    }

    return {
      visible,
      months,
      options,
      selectedMonth,
      show,
      handleClose,
      handleSelect,
      onSelectAllYear,
    }
  },
})
