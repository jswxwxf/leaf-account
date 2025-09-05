import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import { storeKey } from '../store'
import { map, flatten } from 'lodash'
import cfu from '@qiun/wx-ucharts/config-ucharts.js'

defineComponent({
  setup() {
    const { groupedBills } = inject(storeKey)

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
    const chartMinMax = ref([
      [0, 0],
      [0, 0],
      [0, 0],
    ])

    const updateChartData = () => {
      chartReady.value = false
      const categories = map(groupedBills.value, (item) => item.groupInfo.name)
      const amounts = map(groupedBills.value, (item) =>
        parseFloat(Number(item.totalAmount).toFixed(2)),
      )

      // 动态计算 y-axis 的 min 和 max 值
      chartOptions.value.yAxis.data[0].min = Math.floor(Math.min(...amounts))
      chartOptions.value.yAxis.data[0].max = Math.ceil(Math.max(...amounts))

      chartData.value = {
        categories,
        series: [
          {
            name: '金额',
            data: amounts,
          },
        ],
      }

      // let options = {}
      // if (dailyBills.value.length > 7) {
      //   options = {
      //     dataLabel: false,
      //     xAxis: { fontColor: 'rgba(0, 0, 0, 0)' },
      //   }
      // }
      // chartOptions.value = options

      // 延迟确保图表组件渲染完成
      setTimeout(() => {
        chartReady.value = true
      }, 300)
    }

    watch(groupedBills, updateChartData)

    const onChartTap = (e) => {
      chart.value = cfu.instance[e.detail.id]
    }

    const onTouchStart = (e) => {
      chart.value.scrollStart(e)
    }
    const onTouchMove = (e) => {
      chart.value.scroll(e)
    }
    const onTouchEnd = (e) => {
      chart.value.scrollEnd(e)
    }

    return {
      chartReady,
      chartOptions,
      chartData,
      onChartTap,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    }
  },
})
