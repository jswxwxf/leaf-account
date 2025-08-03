import { defineComponent, ref, reactive, computed, provide, onReady } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import Dialog from '@vant/weapp/dialog/dialog.js'
import { newBill } from '@/service/bill-service.js'
import { upsertBill, deleteBill } from '@/api/bill.js'
import store, { storeKey } from './store'

function useBillPopup(state, billPopupRef) {
  const billPopped = ref(false)

  const processBill = async (initialBill) => {
    if (!billPopupRef.value) return

    billPopped.value = true
    let billToUpsert = null

    try {
      billToUpsert = await billPopupRef.value.show(initialBill)
    } finally {
      billPopped.value = false
    }

    if (billToUpsert) {
      const res = await upsertBill(billToUpsert)
      if (res.data) {
        state.updateRawBill(res.data)
      }
    }
  }

  return {
    billPopped,
    processBill,
  }
}

defineComponent({
  setup(props, { selectComponent }) {
    const state = store()
    provide(storeKey, state)

    const billPopup = ref(null)

    onReady(() => {
      billPopup.value = selectComponent('#bill-popup')
    })

    const { billPopped, processBill } = useBillPopup(state, billPopup)

    const handleAddBill = () => {
      processBill(newBill())
    }

    const handleEditBill = (e) => {
      processBill(e.detail)
    }

    const handleDeleteBill = async (e) => {
      const bill = e.detail
      await Dialog.confirm({
        title: '确认删除',
        message: `确定要删除这笔 "${bill.category.name}" 的账单吗？`,
        confirmButtonText: '删除',
      })
      await deleteBill(bill._id)
      state.removeRawBill(bill._id) // 从 store 中移除
      Toast.success('删除成功')
    }

    return {
      ...state,
      billPopped,
      handleAddBill,
      handleEditBill,
      handleDeleteBill,
    }
  },
})
