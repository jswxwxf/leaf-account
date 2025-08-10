import { defineComponent, ref, onShow } from '@vue-mini/core'
import { getCategories } from '@/api/category.js'
import { groupBy } from 'lodash'

defineComponent({
  setup() {
    const activeTab = ref(0)
    const categories = ref({
      expense: [],
      income: [],
    })

    const onTabChange = (event) => {
      activeTab.value = event.detail.index
    }

    async function loadData() {
      const res = await getCategories()
      const grouped = groupBy(res.data, 'type')
      categories.value = {
        expense: grouped['20'] || [],
        income: grouped['10'] || [],
      }
    }

    loadData()

    onShow(() => {
      loadData()
    })

    return {
      activeTab,
      categories,
      onTabChange,
    }
  },
})
