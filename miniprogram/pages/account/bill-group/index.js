import { computed, defineComponent, inject, watch } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'
import { storeKey } from '../store'

defineComponent({
  properties: {
    item: {
      type: Object,
      value: {},
    },
    disabled: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent, selectAllComponents }) {
    const { searchText, billPopped, batchEditPopped, batchChecked, onBatchCheck } = inject(storeKey)

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
      if (props.disabled) return
      const { bill } = e.currentTarget.dataset
      triggerEvent('copy', bill)
    }

    const handleEdit = (e) => {
      if (props.disabled) return
      const { bill } = e.currentTarget.dataset
      triggerEvent('edit', bill)
    }

    const handleDelete = (e) => {
      if (props.disabled) return
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

    const filteredBills = computed(() => {
      return props.item.bills.filter((bill) => {
        return bill.note.includes(searchText.value.trim())
      })
    })

    const allChecked = computed(() => {
      if (filteredBills.value.length === 0) return false
      return filteredBills.value.every((bill) => batchChecked.value[bill._id] === true)
    })

    const toggleAll = () => {
      const shouldCheck = !allChecked.value
      filteredBills.value.forEach((bill) => {
        onBatchCheck(bill, shouldCheck)
      })
    }

    return {
      allChecked,
      toggleAll,
      billPopped,
      batchEditPopped,
      filteredBills,
      batchChecked,
      onBatchCheck,
      handleCopy,
      handleEdit,
      handleDelete,
      handleCopyNote,
    }
  },
})
