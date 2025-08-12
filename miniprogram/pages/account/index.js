import { defineComponent, ref, provide, onReady, onUnload, watch } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import Dialog from '@vant/weapp/dialog/dialog.js'
import { reconcileAccount } from '@/api/account.js'
import { upsertBill, deleteBill, saveBills } from '@/api/bill.js'
import { newBill } from '@/service/bill-service.js'
import store, { storeKey } from './store'
import { useOcr } from '@/composables/use-ocr.js'
import { useAi } from '@/composables/use-ai.js'

function useBillPopup(state, billPopupRef) {
  const { typeValue, monthValue, updateBills, updateAccountSummary } = state

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
      const res = await upsertBill(billToUpsert, {
        month: monthValue.value,
        type: typeValue.value,
      })
      updateBills([res.data])
      updateAccountSummary(res)
    }
  }

  return {
    billPopped,
    processBill,
  }
}

function useProcessPhoto() {
  let _resolve = null
  let _reject = null

  const handleOcrres = async (texts) => {
    try {
      _resolve(texts)
    } catch (err) {
      Toast.fail('未能识别出有效账单')
      _reject(err)
    }
  }
  const { runNativeOCR } = useOcr(handleOcrres)

  function handleOcr(imagePath) {
    runNativeOCR(imagePath)
    return new Promise((resolve, reject) => {
      _resolve = resolve
      _reject = reject
    })
  }

  return {
    handleOcr,
  }
}

defineComponent({
  setup(props, { selectComponent }) {
    const state = store()
    const { typeValue, monthValue, totalBalance, removeBills, updateBills, updateAccountSummary } =
      state
    provide(storeKey, state)

    const billPopup = ref(null)
    const batchPopup = ref(null)
    const reconcilePopup = ref(null)
    const summaryPopup = ref(null)
    const textPopup = ref(null)
    const imagePath = ref('')
    const textContent = ref('')

    const { billPopped, processBill } = useBillPopup(state, billPopup)
    const { handleOcr } = useProcessPhoto()
    const { analyzeBillsFromText } = useAi()

    onReady(() => {
      billPopup.value = selectComponent('#bill-popup')
      batchPopup.value = selectComponent('#batch-popup')
      reconcilePopup.value = selectComponent('#reconcile-popup')
      summaryPopup.value = selectComponent('#summary-popup')
      textPopup.value = selectComponent('#text-popup')
    })

    const scrollTop = ref(0)
    // 监听月份变化，自动滚动到顶部
    watch(monthValue, () => {
      // 通过先设置为一个极小值再设置为0，确保能触发滚动
      scrollTop.value = 0.1
      scrollTop.value = 0
    })

    const handleAddBill = async () => {
      processBill(newBill())
      // await wx.cloud.callFunction({
      //   name: 'data-importer',
      //   data: {},
      //   success: (res) => {
      //     console.log('data-importer called successfully', res.res)
      //     Toast.success('导入成功')
      //   },
      //   fail: (err) => {
      //     console.error('data-importer called failed', err)
      //     Toast.fail('导入失败')
      //   },
      // })
      // await wx.cloud.callFunction({
      //   name: 'data-init',
      //   data: {
      //     task: 'init-category'
      //   },
      //   success: (res) => {
      //     console.log('data-init called successfully', res.res)
      //     Toast.success('导入成功')
      //   },
      //   fail: (err) => {
      //     console.error('data-init called failed', err)
      //     Toast.fail('导入失败')
      //   },
      // })
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
      const res = await deleteBill(bill._id, { month: monthValue.value, type: typeValue.value })
      updateAccountSummary(res)
      removeBills([bill]) // 从 store 中移除
      Toast.success('删除成功')
    }

    const handleBatchBills = async (initialBills) => {
      if (!batchPopup.value) return

      billPopped.value = true

      let bills = null

      try {
        bills = await batchPopup.value.show(initialBills)
      } finally {
        billPopped.value = false
        imagePath.value = ''
        textContent.value = ''
      }

      if (bills && bills.length > 0) {
        const res = await saveBills(bills, { month: monthValue.value, type: typeValue.value })
        updateAccountSummary(res)
        updateBills(res.data)
      }
    }

    const handlePhotoBills = async () => {
      try {
        const res = await wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
        })
        imagePath.value = res.tempFiles[0].tempFilePath
      } catch (err) {
        // Handle cancellation
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          console.error('chooseMedia failed', err)
        }
        return // exit if no image selected
      }

      const texts = await handleOcr(imagePath.value)
      const bills = await analyzeBillsFromText(texts.join(' '))
      if (bills && bills.length > 0) {
        handleBatchBills(bills)
      } else {
        Toast('未识别到有效账单')
      }
    }

    const handleTextBills = async () => {
      textContent.value = await textPopup.value.show()
      const bills = await analyzeBillsFromText(textContent.value)
      if (bills && bills.length > 0) {
        handleBatchBills(bills)
      } else {
        Toast('未识别到有效账单')
      }
    }

    const handleReconcile = async () => {
      const res = await reconcilePopup.value.show(totalBalance.value)
      await reconcileAccount(res.actualBalance)
      // 重新加载账单
      state.loadData()
      Toast.success('对账成功')
    }

    const handleTodaySummary = async () => {
      summaryPopup.value.show({ createdAt: Date.now() })
    }

    const handleActionSelect = (e) => {
      const action = e.detail
      if (action.detail.value === 'batch') {
        handleBatchBills()
        return
      }
      if (action.detail.value === 'photo') {
        handlePhotoBills()
        return
      }
      if (action.detail.value === 'text') {
        handleTextBills()
        return
      }
      if (action.detail.value === 'reconcile') {
        handleReconcile()
        return
      }
      if (action.detail.value === 'today-summary') {
        handleTodaySummary()
        return
      }
    }

    return {
      ...state,
      billPopped,
      scrollTop,
      imagePath,
      textContent,
      handleActionSelect,
      handleAddBill,
      handleEditBill,
      handleDeleteBill,
      handleReconcile,
    }
  },
})
