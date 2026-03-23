import { computed, defineComponent, inject, watch } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'
import { storeKey } from '../store'

defineComponent({
  properties: {
    item: {
      type: Object,
      value: {},
    }
  },
  setup(props, { triggerEvent, selectAllComponents }) {
    const { billPopped, batchEditPopped, batchChecked, onBatchCheck } = inject(storeKey)

    const clearSwipers = () => {
      selectAllComponents('.swipe-cell').forEach((cell) => {
        cell.close()
      })
    }

    onTabChange(() => {
      clearSwipers()
    })
    watch(batchEditPopped, clearSwipers)
    watch(billPopped, clearSwipers)

    const handleCopy = (e) => {
      const { bill, disabled } = e.currentTarget.dataset
      if (disabled) return
      triggerEvent('copy', bill)
    }

    const handleEdit = (e) => {
      const { bill } = e.currentTarget.dataset
      triggerEvent('edit', bill)
    }

    const handleDelete = (e) => {
      const { bill } = e.currentTarget.dataset
      triggerEvent('delete', bill)
    }

    const handleCopyNote = async (e) => {
      const { bill } = e.currentTarget.dataset
      await wx.setClipboardData({
        data: bill.note,
      })
      wx.showToast({
        title: '备注已复制',
        icon: 'none',
        duration: 1500,
      })
    }

    const bills = computed(() => {
      return props.item.bills
    })

    const allChecked = computed(() => {
      if (bills.value.length === 0) return false
      return bills.value.every((bill) => batchChecked.value[bill._id] === true)
    })

    const toggleAll = () => {
      const shouldCheck = !allChecked.value
      bills.value.forEach((bill) => {
        onBatchCheck(bill, shouldCheck)
      })
    }

    return {
      allChecked,
      toggleAll,
      billPopped,
      batchEditPopped,
      bills,
      batchChecked,
      onBatchCheck,
      handleCopy,
      handleEdit,
      handleDelete,
      handleCopyNote,
    }
  },
})
