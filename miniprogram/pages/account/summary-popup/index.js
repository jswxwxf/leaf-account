import { defineComponent, ref, computed, watch, inject } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import { getAllBills } from '@/api/bill.js'
import { formatDate } from '@/utils/date.js'
import { generateSummaryText } from '@/service/bill-service.js'
import { storeKey } from '../store'

defineComponent({
  setup() {
    const { currentAccount, totalIncome, totalExpense } = inject(storeKey)
    const visible = ref(false)
    const content = ref('')
    const currentDate = ref()

    const generateSummary = async () => {
      const query = {
        createdAt: currentDate.value,
        accountId: currentAccount.value._id,
      }
      const res = await getAllBills(query)
      content.value = generateSummaryText(
        res.data,
        totalIncome.value,
        totalExpense.value,
        res.account.balance,
      )
    }

    watch(currentDate, generateSummary)

    const show = async (query = {}) => {
      currentDate.value = query.createdAt || Date.now()
      content.value = ''
      await generateSummary()
      visible.value = true
    }

    const hide = () => {
      visible.value = false
    }

    const handleClose = () => {
      hide()
    }

    const handleCopy = () => {
      wx.setClipboardData({
        data: content.value,
      })
    }

    const handleDateChange = (e) => {
      currentDate.value = e.detail
    }

    return {
      visible,
      content,
      currentDate,
      show,
      handleClose,
      handleCopy,
      handleDateChange,
    }
  },
})
