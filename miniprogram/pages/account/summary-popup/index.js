import { defineComponent, ref, computed, watch } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import { getAllBills } from '@/api/bill.js'
import { formatDate } from '@/utils/date.js'
import { formatMoney } from '@/utils/index.js'
import { isEmpty } from 'lodash'

defineComponent({
  setup() {
    const visible = ref(false)
    const content = ref('')
    const currentDate = ref()

    const generateSummary = async () => {
      const query = { createdAt: formatDate(currentDate.value, 'YYYY-MM-DD') }
      const res = await getAllBills(query)
      const { daily, totalIncome, totalExpense } = (res.data || []).reduce(
        (acc, bill) => {
          const amount = bill.amount || 0
          const date = formatDate(bill.datetime, 'YYYY-MM-DD')

          if (!acc.daily[date]) {
            acc.daily[date] = { income: 0, expense: 0, lines: [] }
          }

          const line = [bill.category?.name, formatMoney(amount), bill.note].join('\t')
          acc.daily[date].lines.push('  ' + line)

          if (bill.category.type === '10') {
            acc.totalIncome += amount
            acc.daily[date].income += amount
          } else {
            acc.totalExpense += amount
            acc.daily[date].expense += amount
          }

          return acc
        },
        { daily: {}, totalIncome: 0, totalExpense: 0 },
      )

      const summaryText = Object.entries(daily)
        .map(([date, summary]) => {
          const header = `${date} 收: ${formatMoney(summary.income)} 支: ${formatMoney(
            summary.expense,
          )}`
          return [header + '\n', ...summary.lines].join('\n')
        })
        .join('\n\n')

      content.value = [
        isEmpty(summaryText) ? '还没有录入账单' : summaryText,
        `\n\n总收: ${formatMoney(totalIncome)}`,
        `总支: ${formatMoney(totalExpense)}`,
        `总余: ${formatMoney(res.account.balance)}`,
      ].join('\n')
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
