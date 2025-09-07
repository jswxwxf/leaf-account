import { defineComponent, inject, ref, watch } from '@vue-mini/core'
import cfu from '@qiun/wx-ucharts/config-ucharts.js'
import { storeKey } from '../store'
import { map } from 'lodash'
import { deepCopy } from '@/utils/index.js'

defineComponent({
  setup() {
    const { groupedBills, dimension, typeValue } = inject(storeKey)

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

    return {
      chartReady,
      chartOptions,
      chartData,
    }
  },
})
