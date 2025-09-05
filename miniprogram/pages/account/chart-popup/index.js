import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import { onTabChange } from '@/utils/index.js'
import { formatDate } from '@/utils/date.js'
import { map, reverse } from 'lodash'
import { storeKey } from '../store'

defineComponent({
  setup() {
    const { dailyBills } = inject(storeKey)

    const visible = ref(false)
    const chartReady = ref(false)
    const chartOptions = ref({})
    const chartData = ref({})

    let _resolve, _reject

    const updateChartData = () => {
      chartReady.value = false
      const reversedBills = reverse([...dailyBills.value])
      const categories = map(reversedBills, (daily) => formatDate(daily.datetime, 'MM-DD'))
      const expenses = map(reversedBills, 'expense')
      const incomes = map(reversedBills, 'income')

      chartData.value = {
        categories,
        series: [
          {
            name: '每日支出',
            data: expenses,
            color: '#1f2937',
          },
          {
            name: '每日收入',
            data: incomes,
            color: '#22c55e',
          },
        ],
      }

      let options = {
        extra: {
          line: {
            type: 'curve',
          },
        },
      }
      if (dailyBills.value.length > 7) {
        options.dataLabel = false
        options.xAxis = { fontColor: 'rgba(0, 0, 0, 0)' }
      }
      chartOptions.value = options

      // 延迟确保图表组件渲染完成
      setTimeout(() => {
        chartReady.value = true
      }, 300)
    }

    const show = () => {
      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    // 监听账单数据变化，自动更新图表
    watch(dailyBills, updateChartData)

    const handleClose = () => {
      _reject && _reject(new Error('用户取消'))
      visible.value = false
    }

    const handleConfirm = () => {
      // 在这里可以添加校验逻辑
      _resolve && _resolve({ success: true }) // 返回需要的数据
      visible.value = false
    }

    onTabChange(() => {
      handleClose()
    })

    return {
      visible,
      chartReady,
      chartOptions,
      chartData,
      show,
      handleClose,
      handleConfirm,
    }
  },
})
