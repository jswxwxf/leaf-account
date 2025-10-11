import { defineComponent, ref, provide, onReady, watch, onTabItemTap } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import Dialog from '@vant/weapp/dialog/dialog.js'
import { reconcileAccount } from '@/api/account.js'
import {
  upsertBill,
  deleteBill,
  saveBills,
  updateBills as batchUpdateBills,
  deleteBills as batchDeleteBills,
} from '@/api/bill.js'
import { newBill } from '@/service/bill-service.js'
import store, { MAX_BATCH_BILLS, storeKey } from './store'
import { useOcr } from '@/composables/use-ocr.js'
import { useAi } from '@/composables/use-ai.js'

function useBillPopup(state, billPopupRef) {
  const {
    currentAccount,
    queryData,
    monthValue,
    searchText,
    updateBills,
    removeBills,
    updateAccountSummary,
    billPopped,
  } = state

  const processBill = async (initialBill) => {
    if (!billPopupRef.value) return

    billPopped.value = true
    let billToUpsert = null

    try {
      billToUpsert = await billPopupRef.value.show(initialBill)
    } finally {
      billPopped.value = false
      searchText.value = ''
    }

    if (billToUpsert) {
      const res = await upsertBill(billToUpsert, {
        ...queryData.value,
        month: monthValue.value,
        accountId: currentAccount.value._id,
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
    const {
      currentAccount,
      queryData,
      monthValue,
      totalIncome,
      totalExpense,
      totalBalance,
      searchText,
      billPopped,
      batchEditPopped,
      removeBills,
      updateBills,
      updateAccountSummary,
    } = state
    provide(storeKey, state)

    const billPopup = ref(null)
    const batchPopup = ref(null)
    const reconcilePopup = ref(null)
    const updatePopup = ref(null)
    const summaryPopup = ref(null)
    const textPopup = ref(null)
    const chartPopup = ref(null)
    const cropPopup = ref(null)

    const imagePath = ref('')
    const textContent = ref('')

    const scrollTo = ref('')

    const { processBill } = useBillPopup(state, billPopup)
    const { handleOcr } = useProcessPhoto()
    const { analyzeBillsFromImage } = useAi()

    onReady(() => {
      billPopup.value = selectComponent('#bill-popup')
      batchPopup.value = selectComponent('#batch-popup')
      reconcilePopup.value = selectComponent('#reconcile-popup')
      updatePopup.value = selectComponent('#update-popup')
      summaryPopup.value = selectComponent('#summary-popup')
      textPopup.value = selectComponent('#text-popup')
      chartPopup.value = selectComponent('#chart-popup')
      cropPopup.value = selectComponent('#crop-popup')
    })

    const scrollTop = ref(0)
    const scrollToTop = () => {
      // 通过先设置为一个极小值再设置为0，确保能触发滚动
      scrollTop.value = 0.1
      scrollTop.value = 0
    }

    // 监听月份或类型变化，自动滚动到顶部
    watch([monthValue, queryData], scrollToTop)

    const refreshing = ref(false)
    const handleRefresh = async () => {
      refreshing.value = true
      try {
        await state.loadData(true)
      } finally {
        refreshing.value = false
      }
    }

    const handleAddBill = async () => {
      await processBill(newBill())
      scrollToTop()
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
      //     task: 'add-pinyin'
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

    const handleCopyBill = async (e) => {
      const billCopy = {
        datetime: Date.now(),
        category: e.detail.category,
        amount: e.detail.amount,
        note: e.detail.note,
        tags: e.detail.tags,
      }
      await processBill(billCopy)
      scrollToTop()
    }

    const handleDeleteBill = async (e) => {
      const bill = e.detail
      await Dialog.confirm({
        title: '确认删除',
        message: `确定要删除这笔 "${bill.category.name}" 的账单吗？`,
        confirmButtonText: '删除',
      })
      const res = await deleteBill(bill._id, {
        ...queryData.value,
        month: monthValue.value,
        accountId: currentAccount.value._id,
      })
      updateAccountSummary(res)
      removeBills([bill]) // 从 store 中移除
      Toast.success('删除成功')
    }

    const handleBatchBills = async (initialBills, options) => {
      if (!batchPopup.value) return

      billPopped.value = true

      let bills = null

      try {
        bills = await batchPopup.value.show(initialBills, options)
      } finally {
        billPopped.value = false
        imagePath.value = ''
        textContent.value = ''
        searchText.value = ''
      }

      if (bills && bills.length > 0) {
        const res = await saveBills(bills, {
          ...queryData.value,
          month: monthValue.value,
          accountId: currentAccount.value._id,
        })
        updateAccountSummary(res)
        updateBills(res.data)
        scrollToTop()
      }
    }

    const handlePhotoBills = async (source = 'media') => {
      try {
        if (source === 'chat') {
          const { tempFiles } = await wx.chooseMessageFile({
            count: 1,
            type: 'image',
          })
          imagePath.value = tempFiles[0].path
        } else {
          const { tempFiles } = await wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: ['album', 'camera'],
          })
          imagePath.value = tempFiles[0].tempFilePath
        }
      } catch (err) {
        // Handle cancellation
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          console.error('chooseMedia failed', err)
        }
        return // exit if no image selected
      }

      // 用户裁剪图片
      imagePath.value = await cropPopup.value.show(imagePath.value)

      // const texts = await handleOcr(imagePath.value)
      // textContent.value = texts.join('\n')
      const bills = await analyzeBillsFromImage(imagePath.value)
      if (bills && bills.length > 0) {
        if (bills.length > MAX_BATCH_BILLS) {
          Toast.fail(`单次识别账单数量不能超过 ${MAX_BATCH_BILLS} 条`)
          return
        }
        handleBatchBills(bills, { noteMoveable: true })
      } else {
        Toast('未识别到有效账单')
      }
    }

    const handleTextBills = async () => {
      textContent.value = await textPopup.value.show('', {
        placeholder: '请输入账单文本内容...',
        confirmText: 'AI 识别',
      })
      const bills = await analyzeBillsFromText(textContent.value)
      if (bills && bills.length > 0) {
        if (bills.length > MAX_BATCH_BILLS) {
          Toast.fail(`单次识别账单数量不能超过 ${MAX_BATCH_BILLS} 条`)
          return
        }
        handleBatchBills(bills, { noteMoveable: true })
      } else {
        Toast('未识别到有效账单')
      }
    }

    const handleReconcile = async () => {
      const res = await reconcilePopup.value.show(totalBalance.value)
      await reconcileAccount(res.actualBalance, currentAccount.value._id)
      // 重新加载账单
      state.loadData()
      Toast.success('对账成功')
    }

    const handleBatchEdit = async () => {
      batchEditPopped.value = true
      try {
        const { ids, data, action } = await updatePopup.value.show()
        batchEditPopped.value = false
        if (action === 'delete') {
          const res = await batchDeleteBills({
            ids,
            accountId: currentAccount.value._id,
            ...queryData.value,
            month: monthValue.value,
          })
          updateAccountSummary(res)
          removeBills(ids)
          Toast.success('批量删除成功')
        } else {
          const res = await batchUpdateBills(
            {
              ids,
              accountId: currentAccount.value._id,
              ...queryData.value,
              month: monthValue.value,
            },
            data,
          )
          updateAccountSummary(res)
          updateBills(res.data)
          Toast.success('批量修改成功')
        }
      } finally {
        batchEditPopped.value = false
      }
    }

    const handleTodaySummary = async () => {
      summaryPopup.value.show({
        createdAt: Date.now(),
        account: currentAccount.value,
        totalIncome: totalIncome.value,
        totalExpense: totalExpense.value,
      })
    }

    const handleChart = async () => {
      billPopped.value = true
      try {
        await chartPopup.value.show()
      } finally {
        billPopped.value = false
      }
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
      if (action.detail.value === 'chat-photo') {
        handlePhotoBills('chat')
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
      if (action.detail.value === 'batch-edit') {
        handleBatchEdit()
        return
      }
      if (action.detail.value === 'chart') {
        handleChart()
        return
      }
    }

    const handleTapDay = (e) => {
      scrollTo.value = 'date-' + e.detail
    }

    onTabItemTap(() => {
      getApp().globalData.currentTab.value = 'account'
    })

    return {
      ...state,
      scrollTop,
      imagePath,
      textContent,
      refreshing,
      scrollTo,
      handleRefresh,
      handleActionSelect,
      handleAddBill,
      handleEditBill,
      handleCopyBill,
      handleDeleteBill,
      handleReconcile,
      handleTapDay,
    }
  },
})
