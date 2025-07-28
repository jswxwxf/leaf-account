import { defineComponent, inject, ref } from '@vue-mini/core'
import { storeKey } from '../store'

defineComponent({
  properties: {},
  setup() {
    const { typeValue, dateValue, totalExpense, totalIncome } = inject(storeKey)

    const typeOptions = ref([
      { text: '全部类型', value: 0 },
      { text: '支出', value: 1 },
      { text: '收入', value: 2 },
    ])

    const dateOptions = ref([
      { text: '2025年7月', value: 0 },
      { text: '2025年6月', value: 1 },
      { text: '2025年5月', value: 2 },
    ])

    return {
      typeOptions,
      dateOptions,
      typeValue,
      dateValue,
      totalExpense,
      totalIncome,
    }
  },
})
