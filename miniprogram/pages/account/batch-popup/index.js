import { defineComponent, inject, nextTick, ref } from '@vue-mini/core'
import { isEmpty } from 'lodash'
import Toast from '@vant/weapp/toast/toast.js'
import Dialog from '@vant/weapp/dialog/dialog.js'
import { parseDate } from '@/utils/date.js'
import { onTabChange, deepCopy, generateId } from '@/utils/index.js'
import { newBill } from '@/service/bill-service.js'
import { MAX_BATCH_BILLS } from '../store'

defineComponent({
  setup(props, { selectAllComponents }) {

    const visible = ref(false)
    const list = ref([])
    const outList = ref([])
    const billForms = ref([])
    const options = ref()
    const hasInitialBills = ref(false)

    let _resolve, _reject

    onTabChange(() => {
      hide()
    })

    const show = (bills, opts = {}) => {
      options.value = opts
      hasInitialBills.value = bills && bills.length > 0
      if (hasInitialBills.value) {
        list.value = bills.map((bill) => ({
          _tempid: generateId('bill-'),
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
        })
      })
      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const handleClose = async () => {
      if (!hasInitialBills.value) {
        hide()
        return
      }

      await Dialog.confirm({
        title: '提示',
        message: '关闭后将丢失未保存的修改，是否确认关闭？',
      })
      hide()
    }

    const hide = () => {
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
      if (value?.note) {
        list.value[rowIndex].note = value.note
      }
    }

    const handlePositionChange = (e) => {
      const { rowIndex } = e.currentTarget.dataset
      const dir = e.detail

      if (dir === 'up') {
        // 从 rowIndex 的下一个元素开始，将其 note 赋值给前一个元素
        for (let i = rowIndex + 1; i < list.value.length; i++) {
          list.value[i - 1].note = list.value[i].note
        }
        // 将 outList 的第一个值移入最后一个元素的 note
        if (list.value.length > 0) {
          list.value[list.value.length - 1].note = outList.value.shift() || ''
        }
      } else if (dir === 'down') {
        // 将最后一个元素的 note 存入 outList
        if (list.value.length > 0) {
          outList.value.unshift(list.value[list.value.length - 1].note)
        }
        // 从倒数第二个元素开始，将其 note 向下移动一位，直到 rowIndex
        for (let i = list.value.length - 2; i >= rowIndex; i--) {
          list.value[i + 1].note = list.value[i].note
        }
        // 根据需求，当前行的 note 保持不变，所以 rowIndex 的 note 不需要清空
      }
    }

    const handleAddRow = (e) => {
      if (list.value.length >= MAX_BATCH_BILLS) {
        Toast(`最多只能添加 ${MAX_BATCH_BILLS} 条账单`)
        return
      }
      const { rowIndex } = e.currentTarget.dataset
      const newRow = newBill()
      newRow.inserted = true
      list.value.splice(rowIndex + 1, 0, newRow)

      // Remove the animation class after the animation is done
      setTimeout(() => {
        delete newRow.inserted
      }, 300) // Match animation duration
    }

    const handleDeleteRow = (e) => {
      const { rowIndex } = e.currentTarget.dataset
      if (list.value.length <= 1) return

      const itemToDelete = list.value[rowIndex]

      itemToDelete.deleted = true

      // 2. After the animation duration, remove that specific item from the array
      setTimeout(() => {
        list.value = list.value.filter((item) => !item.deleted)
      }, 300) // Match the animation duration in WXSS
    }

    const handleCopyRow = (e) => {
      if (list.value.length >= MAX_BATCH_BILLS) {
        Toast(`最多只能添加 ${MAX_BATCH_BILLS} 条账单`)
        return
      }
      const { rowIndex } = e.currentTarget.dataset
      const rowToCopy = list.value[rowIndex]
      // Deep copy to avoid reference issues
      const newRow = {
        ...deepCopy(rowToCopy),
        _tempid: generateId('bill-'), // 复制的行也需要新的唯一 ID
        inserted: true,
      }
      list.value.splice(rowIndex + 1, 0, newRow)

      // Remove the animation class after the animation is done
      setTimeout(() => {
        delete newRow.inserted
      }, 300) // Match animation duration
    }

    return {
      visible,
      list,
      options,
      show,
      handleClose,
      handleConfirm,
      handleFormChange,
      handlePositionChange,
      handleAddRow,
      handleDeleteRow,
      handleCopyRow,
    }
  },
})
