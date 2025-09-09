import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import cfu from '@qiun/wx-ucharts/config-ucharts.js'
import { storeKey } from '../store'
import { map, flatten } from 'lodash'
import { deepCopy } from '@/utils/index.js'

defineComponent({
  setup(props, { triggerEvent }) {
    const { availableAccounts } = inject(storeKey)

    const chartReady = ref(false)
    const chartOptions = ref({
      dataLabel: true,
      enableScroll: false,
      legend: {
        show: false,
      },
      xAxis: {
        rotateLabel: true,
        marginTop: 16,
      },
      yAxis: {
        data: [{}],
        splitNumber: 4,
      },
      extra: {
        column: {
          type: 'group',
          width: 30,
          activeBgColor: '#000000',
          activeBgOpacity: 0.08,
          // barBorderCircle: true,
          // linearType: 'custom',
        },
      },
    })
    const chartData = ref({})

    const updateChartData = () => {
      chartReady.value = false
      if (!availableAccounts.value || availableAccounts.value.length === 0) {
        return
      }

      const categories = map(availableAccounts.value, (account) => account.title)
      const balances = map(availableAccounts.value, (item) =>
        parseFloat(Number(item.balance).toFixed(2)),
      )

      // 动态计算 y-axis 的 min 和 max 值
      chartOptions.value.yAxis.data[0].min = Math.floor(Math.min(...balances, 0))
      chartOptions.value.yAxis.data[0].max = Math.ceil(Math.max(...balances, 0))

      chartData.value = deepCopy({
        categories: categories,
        series: [
          {
            name: '结余',
            data: balances,
            color: '#3b82f6',
          },
        ],
      })

      // 延迟确保图表组件渲染完成
      setTimeout(() => {
        chartReady.value = true
      }, 300)
    }

    watch(availableAccounts, updateChartData)

    const onChartTap = (e) => {
      const currentIndex = e.detail?.currentIndex?.index
      if (currentIndex === -1 || currentIndex === undefined) return

      const selectedData = availableAccounts.value[currentIndex]
      if (selectedData) {
        triggerEvent('item-tap', selectedData)
      }
    }

    return {
      chartReady,
      chartOptions,
      chartData,
      onChartTap,
    }
  },
})
