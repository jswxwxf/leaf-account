import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import cfu from '@qiun/wx-ucharts/config-ucharts.js'
import { storeKey } from '../store'
import { map } from 'lodash'
import { deepCopy } from '@/utils/index.js'

defineComponent({
  setup(props, { triggerEvent }) {
    const { groupedBills, dimension, typeValue } = inject(storeKey)

    const chart = ref()
    const chartReady = ref(false)
    const chartOptions = ref({
      enableScroll: false,
      extra: {
        pie: {
          activeOpacity: 0.5,
          activeRadius: 10,
          offsetAngle: 0,
          labelWidth: 15,
          border: true,
          borderWidth: 1,
          borderColor: '#FFFFFF',
          linearType: 'custom',
        },
      },
    })
    const chartData = ref({})

    const updateChartData = () => {
      chartReady.value = false
      if (!groupedBills.value || groupedBills.value.length === 0) {
        return
      }

      let data
      // 按月份
      if (dimension.value === 'month') {
        data = groupedBills.value.map((item) => ({
          name: item._id,
          value: Math.abs(item.totalAmount),
          labelText: `${item._id.split('-')[1]}月: ${Number(item.totalAmount).toFixed(2)}`,
        }))
      } else {
        // 按分类
        if (typeValue.value === '20') {
          data = [...groupedBills.value]
            .reverse()
            .slice(0, 5)
            .map((item) => ({
              name: item?.groupInfo?.name || item._id,
              value: Math.abs(item.totalAmount),
              labelText: `${item.groupInfo.name}: ${Number(item.totalAmount).toFixed(2)}`,
            }))
        } else {
          data = groupedBills.value.slice(0, 5).map((item) => ({
            name: item.groupInfo.name,
            value: Math.abs(item.totalAmount),
            labelText: `${item.groupInfo.name}: ${Number(item.totalAmount).toFixed(2)}`,
          }))
        }
      }

      chartData.value = deepCopy({
        series: [{ data }],
      })

      // 延迟确保图表组件渲染完成
      setTimeout(() => {
        chartReady.value = true
      }, 300)
    }

    watch(groupedBills, updateChartData)

    const onChartTap = (e) => {
      chart.value = cfu.instance[e.detail.id]
      const currentIndex = e.detail?.currentIndex
      if (currentIndex === -1 || currentIndex === undefined) return

      let selectedData
      // 饼图在支出分类时，数据源是 `[...groupedBills.value].reverse().slice(0, 5)`
      // 这意味着图表上索引为 `i` 的项，对应原始数组 `groupedBills` 中倒数第 `i+1` 个元素。
      if (typeValue.value === '20' && dimension.value === 'category') {
        const originalIndex = groupedBills.value.length - 1 - currentIndex
        selectedData = groupedBills.value[originalIndex]
      } else {
        // 其他情况，数据源是 `groupedBills.value.slice(0, 5)`，索引可以直接对应。
        selectedData = groupedBills.value[currentIndex]
      }

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
