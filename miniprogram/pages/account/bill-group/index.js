import { computed, defineComponent, inject } from '@vue-mini/core'
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
    const { searchText } = inject(storeKey)

    onTabChange(() => {
      selectAllComponents('.swipe-cell').forEach((cell) => {
        cell.close()
      })
    })

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

    return {
      handleCopy,
      handleEdit,
      handleDelete,
      handleCopyNote,
      filteredBills,
    }
  },
})
