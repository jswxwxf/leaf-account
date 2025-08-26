import { defineComponent, inject, nextTick, ref } from '@vue-mini/core'
import { isEmpty } from 'lodash'
import Toast from '@vant/weapp/toast/toast.js'
import { parseDate } from '@/utils/date.js'
import { onTabChange } from '@/utils/index.js'
import { newBill } from '@/service/bill-service.js'
import { storeKey, MAX_BATCH_BILLS } from '../store'

defineComponent({
  setup(props, { selectAllComponents }) {
    const { searchText, updateSearchText, notes } = inject(storeKey)

    const visible = ref(false)
    const list = ref([])
    const billForms = ref([])

    let _resolve, _reject

    onTabChange(() => {
      handleClose()
    })

    const show = (bills) => {
      if (bills && bills.length > 0) {
        list.value = bills.map((bill) => ({
          datetime: parseDate(bill.datetime),
          category: '', // AI尚不能识别分类
          amount: bill.amount || '',
          note: bill.note || '',
          tags: [], // AI尚不能识别标签
        }))
      } else {
        // 如果没有传入账单，则显示3个空行供手动输入
        list.value = Array.from({ length: 3 }, newBill)
      }
      nextTick(() => {
        selectAllComponents('.bill-form').forEach((form) => {
          form.clearErrors()
          form.setExtra('notes', notes)
        })
      })
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
      billForms.value = selectAllComponents('.bill-form')

      // 创建一个校验任务数组
      const validationPromises = list.value.map((bill, index) => {
        const form = billForms.value[index]
        // 返回每个表单的校验 Promise
        return form.validate(bill)
      })

      // 等待所有表单校验完成
      const results = await Promise.all(validationPromises)

      // 检查是否所有表单都通过了校验
      const allValid = results.every(({ isValid }) => isValid)

      if (allValid) {
        // 全部通过后，才执行提交
        _resolve(list.value)
        visible.value = false
      }
    }

    const handleFormChange = (e) => {
      const { rowIndex, field } = e.currentTarget.dataset
      // 自定义组件的 value 在 e.detail 中，而不是 e.detail.value
      let value = e.detail
      list.value[rowIndex][field] = value
      if (value.note) {
        list.value[rowIndex].note = value.note
      }
    }

    const handleAddRow = (e) => {
      if (list.value.length >= MAX_BATCH_BILLS) {
        Toast(`最多只能添加 ${MAX_BATCH_BILLS} 条账单`)
        return
      }
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
      if (list.value.length >= MAX_BATCH_BILLS) {
        Toast(`最多只能添加 ${MAX_BATCH_BILLS} 条账单`)
        return
      }
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
      searchText,
      updateSearchText,
    }
  },
})
