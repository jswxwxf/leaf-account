import { computed, defineComponent, inject } from '@vue-mini/core'
import { storeKey } from '../store'

defineComponent({
  properties: {
    item: {
      type: Object,
      value: {},
    },
    readonly: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent }) {
    const { searchText } = inject(storeKey)

    const handleEdit = (e) => {
      if (props.readonly) return
      const { bill } = e.currentTarget.dataset
      triggerEvent('edit', bill)
    }

    const handleDelete = (e) => {
      if (props.readonly) return
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
        return bill.note.includes(searchText.value)
      })
    })

    return {
      handleEdit,
      handleDelete,
      handleCopyNote,
      filteredBills,
    }
  },
})
