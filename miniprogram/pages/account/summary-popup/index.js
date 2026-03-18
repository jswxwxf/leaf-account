import { defineComponent, ref, watch, inject } from '@vue-mini/core'
import dayjs from '@/vendor/dayjs/esm/index.js'
import Toast from '@vant/weapp/toast/toast.js'
import { getAllBills, getBillsSummary } from '@/api/bill.js'
import { formatDate } from '@/utils/date.js'
import { onTabChange } from '@/utils/index.js'
import { generateSummaryText } from '@/service/bill-service.js'
import { storeKey } from '../store'

defineComponent({
  setup() {
    const { currentAccount } = inject(storeKey)
    const visible = ref(false)
    const content = ref('')
    const currentDate = ref()
    const totalIncome = ref(0)
    const totalExpense = ref(0)
    const totalSaving = ref(0)

    const generateSummary = async () => {
      const query = {
        createdAt: currentDate.value,
        accountId: currentAccount.value._id,
      }
      const summaryQuery = {
        month: dayjs(currentDate.value).format('YYYY-MM'),
        accountId: currentAccount.value._id,
      }
      const [billsRes, summaryRes] = await Promise.all([
        getAllBills(query),
        getBillsSummary(summaryQuery),
      ])
      totalIncome.value = summaryRes.data.totalIncome || 0
      totalExpense.value = summaryRes.data.totalExpense || 0
      totalSaving.value = summaryRes.data.totalSaving || 0
      content.value = generateSummaryText(
        billsRes.data,
        totalIncome.value,
        totalExpense.value,
        totalSaving.value,
        billsRes.account.balance,
      )
    }

    watch(currentDate, generateSummary)

    onTabChange(() => {
      handleClose()
    })

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
