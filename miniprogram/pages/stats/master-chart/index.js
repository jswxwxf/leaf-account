import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import cfu from '@qiun/wx-ucharts/config-ucharts.js'
import { storeKey } from '../store'
import { map, flatten } from 'lodash'
import { deepCopy } from '@/utils/index.js'

defineComponent({
  setup() {
    const { openedAccounts } = inject(storeKey)

    const chartReady = ref(false)
    const chartOptions = ref({
      enableScroll: false,
      dataLabel: false,
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
    const chartMinMax = ref([
      [0, 0],
      [0, 0],
      [0, 0],
    ])

    const updateChartData = () => {
      chartReady.value = false
      const categories = map(openedAccounts.value, (account) => account.title)
      const expenses = map(openedAccounts.value, (item) =>
        parseFloat((Number(item.totalExpense) / 10000).toFixed(2)),
      )
      const incomes = map(openedAccounts.value, (item) =>
        parseFloat((Number(item.totalIncome) / 10000).toFixed(2)),
      )
      const balances = map(openedAccounts.value, (item) =>
        parseFloat((Number(item.balance) / 10000).toFixed(2)),
      )

      // 动态计算 y-axis 的 min 和 max 值
      chartMinMax.value[0] = [Math.floor(Math.min(...expenses)), Math.ceil(Math.max(...expenses))]
      chartMinMax.value[1] = [Math.floor(Math.min(...incomes)), Math.ceil(Math.max(...incomes))]
      chartMinMax.value[2] = [Math.floor(Math.min(...balances)), Math.ceil(Math.max(...balances))]

      const allData = flatten(chartMinMax.value)
      const finalMin = Math.min(...allData)
      const finalMax = Math.max(...allData)
      chartOptions.value.yAxis.data[0].min = finalMin
      chartOptions.value.yAxis.data[0].max = finalMax

      if (openedAccounts.value.length <= 3) {
        chartOptions.value.dataLabel = true
      }

      chartData.value = deepCopy({
        categories: categories,
        series: [
          {
            name: '支出(万)',
            data: expenses,
            color: '#1f2937',
          },
          {
            name: '收入(万)',
            data: incomes,
            color: '#22c55e',
          },
          {
            name: '结余(万)',
            data: balances,
            color: '#3b82f6',
          },
        ],
      })

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

    watch(openedAccounts, updateChartData)

    const onChartTap = (e) => {
      if (e.detail.legendIndex === -1) return
      const chart = cfu.instance[e.detail.id]
      const legends = chart.opts.chartData.legendData.points[0]
      const options = {
        dataLabel: chartOptions.value.dataLabel,
        yAxis: {
          data: [{}],
        },
      }

      // 根据可见的 legends，从已计算好的 chartMinMax 中收集 min/max 范围
      let visibleCount = 0
      let allData = legends.reduce((acc, legend, index) => {
        if (legend.show) {
          visibleCount++
          acc.push(...chartMinMax.value[index])
        }
        return acc
      }, [])
      if (visibleCount === 0) {
        allData = flatten(chartMinMax.value)
      }

      const finalMin = Math.min(...allData)
      const finalMax = Math.max(...allData)
      options.yAxis = {
        data: [
          {
            min: finalMin,
            max: finalMax,
          },
        ],
      }

      if (visibleCount === 1) {
        options.dataLabel = true
      }

      options.redraw = true
      chart.updateData(options)
    }

    return {
      chartReady,
      chartOptions,
      chartData,
      onChartTap,
    }
  },
})
