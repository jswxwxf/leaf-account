import { defineComponent, ref } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import { getAllBills } from '@/api/bill.js'
import { formatDate } from '@/utils/date.js'
import { formatMoney } from '@/utils/index.js'

defineComponent({
  setup() {
    const visible = ref(false)
    const content = ref('')
    let _resolve

    const show = async (query) => {
      const createdDate = formatDate(query.createdDate, 'YYYY-MM-DD')
      const res = await getAllBills({ createdDate })
      const { totalIncome, totalExpense, summaryLines } = (res.data || []).reduce(
        (acc, bill) => {
          const amount = bill.amount || 0
          if (bill.category.type === '10') {
            acc.totalIncome += amount
          } else {
            acc.totalExpense += amount
          }
          const line = [
            formatDate(bill.datetime, 'YYYY-MM-DD'),
            bill.category?.name,
            bill.note,
            formatMoney(amount),
          ].join('\t')
          acc.summaryLines.push(line)
          return acc
        },
        { totalIncome: 0, totalExpense: 0, summaryLines: [] },
      )

      const summaryText = [
        ...summaryLines,
        `\n收入: ${formatMoney(totalIncome)}`,
        `支出: ${formatMoney(-totalExpense)}`,
        `余额: ${formatMoney(res.account.balance)}`,
      ].join('\n')
      content.value = summaryText
      visible.value = true
      return new Promise((resolve) => {
        _resolve = resolve
      })
    }

    const hide = () => {
      visible.value = false
      _resolve()
    }

    const handleClose = () => {
      hide()
    }

    const handleCopy = () => {
      wx.setClipboardData({
        data: content.value,
      })
    }

    return {
      visible,
      content,
      show,
      handleClose,
      handleCopy,
    }
  },
})
