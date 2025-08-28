import { computed, defineComponent, inject, onReady, ref, watch } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'
import { storeKey } from '../store'

defineComponent({
  setup(props, { selectComponent }) {
    const { rawBills, notes, batchChecked, clearBatchCheck, batchAllChecked, batchCheckAll } =
      inject(storeKey)

    const visible = ref(false)
    const updateField = ref()
    const updateData = ref()
    const updateForm = ref()

    const rules = {
      datetime: 'required',
      category: 'required',
      amount: 'required|requiredMoney',
      note: 'required|max:20',
      tags: 'required',
    }

    const categoryOptions = computed(() => {
      return {
        disableNew: true,
        disableTransfer: true,
        disableType: checkedBills.value[0]?.category?.type === '20' ? '10' : '20',
      }
    })

    let _resolve, _reject

    // 当切换 Tab 时，自动关闭弹窗
    onTabChange((newTab) => {
      if (newTab !== 'account') {
        handleClose()
      }
    })

    onReady(() => {
      // 获取表单组件实例
      updateForm.value = selectComponent('#update-form')
      updateForm.value.setExtra('notes', notes)
    })

    const show = () => {
      updateField.value = {}
      updateData.value = {}
      clearBatchCheck()
      visible.value = true
      updateForm.value.clearErrors()
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
      const hasCheckedItems = Object.values(batchChecked.value).some((v) => v)
      if (!hasCheckedItems) {
        wx.showToast({
          title: '请至少选择一笔账单',
          icon: 'none',
        })
        return
      }

      const result = await updateForm.value.validate(updateData.value)
      if (result.isInvalid) {
        return
      }

      _resolve &&
        _resolve({
          ids: Object.keys(batchChecked.value).filter((id) => batchChecked.value[id]),
          data: updateData.value,
        })
      visible.value = false
    }

    const handleFieldChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
      updateForm.value.registerRule(field, value ? rules[field] : null)
      updateField.value[field] = value
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
      updateData.value[field] = value
      if (value.note) {
        updateData.value.note = value.note
      }
    }

    const checkedBills = computed(() => {
      const checkedIds = Object.keys(batchChecked.value).filter((id) => batchChecked.value[id])
      if (checkedIds.length < 1) return []

      return rawBills.value.filter((bill) => checkedIds.includes(bill._id))
    })

    const hasTransferUpdating = computed(() => {
      if (checkedBills.value.length === 0) return false
      return checkedBills.value.some((bill) => bill.relatedBill)
    })

    const hasConflictCategory = computed(() => {
      if (checkedBills.value.length < 2) return false

      const firstType = checkedBills.value[0].category.type
      return checkedBills.value.some((bill) => bill.category.type !== firstType)
    })

    watch(hasTransferUpdating, (newVal) => {
      if (newVal) {
        updateField.value.category = false
        updateField.value.note = false
      }
    })

    watch(hasConflictCategory, (newVal) => {
      if (newVal) {
        updateField.value.amount = false
      }
    })

    return {
      visible,
      batchAllChecked,
      updateField,
      updateData,
      hasTransferUpdating,
      hasConflictCategory,
      categoryOptions,
      show,
      handleClose,
      handleConfirm,
      handleFieldChange,
      handleFormChange,
      batchCheckAll,
    }
  },
})
