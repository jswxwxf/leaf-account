import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import cfu from '@qiun/wx-ucharts/config-ucharts.js'
import { storeKey } from '../store'
import { map } from 'lodash'
import { deepCopy } from '@/utils/index.js'

defineComponent({
  setup() {
    const { groupedBills, dimension, typeValue } = inject(storeKey)

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
      let categories
      let amounts

      // 按月份
      if (dimension.value === 'month') {
        categories = map(groupedBills.value, (item) => item._id)
        if (typeValue.value === '20') {
          amounts = map(groupedBills.value, (item) =>
            Math.abs(parseFloat(Number(item.totalAmount).toFixed(2))),
          )
        } else {
          amounts = amounts = map(groupedBills.value, (item) =>
            parseFloat(Number(item.totalAmount).toFixed(2)),
          )
        }
      } else {
        // 按分类
        if (typeValue.value === '20') {
          categories = map(groupedBills.value, (item) => item.groupInfo.name).reverse()
          amounts = map(groupedBills.value, (item) =>
            Math.abs(parseFloat(Number(item.totalAmount).toFixed(2))),
          ).reverse()
        } else {
          categories = map(groupedBills.value, (item) => item.groupInfo.name)
          amounts = map(groupedBills.value, (item) =>
            parseFloat(Number(item.totalAmount).toFixed(2)),
          )
        }
      }

      // 动态计算 y-axis 的 min 和 max 值
      chartOptions.value.yAxis.data[0].min = Math.floor(Math.min(...amounts, 0))
      chartOptions.value.yAxis.data[0].max = Math.ceil(Math.max(...amounts, 0))

      let color = {
        10: '#22c55e',
        20: '#1f2937',
      }[typeValue.value]

      chartData.value = deepCopy({
        categories,
        series: [
          {
            name: '金额',
            data: amounts,
            color,
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
      chartReady,
      chartOptions,
      chartData,
      onChartTap,
    }
  },
})
