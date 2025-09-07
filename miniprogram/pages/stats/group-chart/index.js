import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import cfu from '@qiun/wx-ucharts/config-ucharts.js'
import { storeKey } from '../store'
import { map } from 'lodash'
import { deepCopy } from '@/utils/index.js'

defineComponent({
  setup() {
    const state = inject(storeKey)
    const { groupedBills } = state

    const chart = ref()
    const chartReady = ref(false)
    const chartOptions = ref({
      dataLabel: true,
      enableScroll: true,
      legend: {
        show: false,
      },
      xAxis: {
        // rotateLabel: true,
        marginTop: 16,
        itemCount: 5,
        scrollShow: true,
      },
      yAxis: {
        data: [{ tofix: 0 }],
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
      if (!groupedBills.value || groupedBills.value.length === 0) {
        return
      }
      const categories = map(groupedBills.value, (item) => item.groupInfo.name)
      const amounts = map(groupedBills.value, (item) =>
        parseFloat(Number(item.totalAmount).toFixed(2)),
      )

      // 动态计算 y-axis 的 min 和 max 值
      chartOptions.value.yAxis.data[0].min = Math.floor(Math.min(...amounts, 0))
      chartOptions.value.yAxis.data[0].max = Math.ceil(Math.max(...amounts, 0))

      chartData.value = deepCopy({
        categories,
        series: [
          {
            name: '金额',
            data: amounts,
          },
        ],
      })

      // 延迟确保图表组件渲染完成
      setTimeout(() => {
        chartReady.value = true
      }, 300)
    }

    watch(groupedBills, updateChartData)

    const onChartTap = (e) => {
      chart.value = cfu.instance[e.detail.id]
    }

    return {
      ...state,
      chartReady,
      chartOptions,
      chartData,
      onChartTap,
    }
  },
})
