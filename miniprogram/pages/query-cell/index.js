import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  properties: {},
  setup() {
    const startDate = ref(null)
    const endDate = ref(null)
    const minAmount = ref('')
    const maxAmount = ref('')
    const note = ref('')

    // 以后可以从API获取
    const categories = ref([
      { _id: '1', name: '餐饮', type: '20' },
      { _id: '2', name: '交通', type: '20' },
      { _id: '3', name: '工资', type: '10' },
      { _id: '4', name: '购物', type: '20' },
    ])

    const tags = ref([
      { _id: '1', name: '公司' },
      { _id: '2', name: '家庭' },
      { _id: '3', name: '出差' },
    ])

    return {
      startDate,
      endDate,
      minAmount,
      maxAmount,
      note,
      categories,
      tags,
    }
  },
})
