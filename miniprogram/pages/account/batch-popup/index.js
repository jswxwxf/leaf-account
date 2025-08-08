import { defineComponent, ref } from '@vue-mini/core'
import { isEmpty } from 'lodash'
import { parseDate } from '@/utils/date.js'
import { newBill } from '@/service/bill-service.js'

defineComponent({
  setup() {
    const visible = ref(false)
    const list = ref([])

    let _resolve, _reject

    const show = (bills) => {
      if (bills && bills.length > 0) {
        list.value = bills.map((bill) => ({
          datetime: parseDate(bill.datetime),
          category: '', // AI尚不能识别分类
          amount: bill.amount || '',
          note: bill.note || '',
          tags: '', // AI尚不能识别标签
        }))
      } else {
        // 如果没有传入账单，则显示3个空行供手动输入
        list.value = Array.from({ length: 3 }, newBill)
      }
      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const handleClose = () => {
      _reject(new Error('用户取消'))
      visible.value = false
    }

    const handleConfirm = () => {
      _resolve(list.value)
      visible.value = false
    }

    const handleFormChange = (e) => {
      const { rowIndex, field } = e.currentTarget.dataset
      // 自定义组件的 value 在 e.detail 中，而不是 e.detail.value
      list.value[rowIndex][field] = e.detail
    }

    const handleAddRow = (e) => {
      if (list.value.length >= 20) return
      const { rowIndex } = e.currentTarget.dataset
      list.value.splice(rowIndex + 1, 0, newBill())
    }

    const handleDeleteRow = (e) => {
      const { rowIndex } = e.currentTarget.dataset
      if (list.value.length > 1) {
        list.value.splice(rowIndex, 1)
      }
    }

    const handleCopyRow = (e) => {
      if (list.value.length >= 20) return
      const { rowIndex } = e.currentTarget.dataset
      const rowToCopy = list.value[rowIndex]
      // Deep copy to avoid reference issues
      const newRow = JSON.parse(JSON.stringify(rowToCopy))
      list.value.splice(rowIndex + 1, 0, newRow)
    }

    return {
      visible,
      list,
      show,
      handleClose,
      handleConfirm,
      handleFormChange,
      handleAddRow,
      handleDeleteRow,
      handleCopyRow,
    }
  },
})
