import { defineComponent, ref, onShow, onReady } from '@vue-mini/core'
import Dialog from '@vant/weapp/dialog/dialog'
import { groupBy } from 'lodash'
import { addCategory, getCategories, deleteCategory, updateCategory } from '@/api/category.js'

defineComponent({
  setup(props, { selectComponent }) {
    const activeTab = ref(20)
    const categories = ref({
      expense: [],
      income: [],
    })
    const newCategory = ref({ name: '' })
    const categoryForm = ref()

    onReady(() => {
      categoryForm.value = selectComponent('#categoryForm')
    })

    const onTabChange = (event) => {
      activeTab.value = event.detail.name
    }

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      newCategory.value[field] = e.detail
    }

    async function loadData() {
      const res = await getCategories()
      const grouped = groupBy(res.data, 'type')
      categories.value = {
        expense: grouped['20'] || [],
        income: grouped['10'] || [],
      }
    }

    const handleAdd = async () => {
      const result = await categoryForm.value.validate(newCategory.value)
      if (result.isInvalid) {
        return
      }

      const type = activeTab.value // 20: expense, 10: income
      await addCategory({
        name: newCategory.value.name,
        type,
      })
      newCategory.value = { name: '' }
      categoryForm.value.clearErrors()
      await loadData()
      wx.showToast({ title: '添加成功', icon: 'success' })
    }

    const handleEdit = async (event) => {
      // await Dialog.confirm({
      //   title: '确认删除',
      //   message: '删除后将无法恢复，是否继续？',
      // })
      // await deleteCategory(event.detail)
      // await loadData()
      // wx.showToast({ title: '删除成功', icon: 'success' })
    }

    const handleDelete = async (event) => {
      await Dialog.confirm({
        title: '确认删除',
        message: '删除后将无法恢复，是否继续？',
      })
      await deleteCategory(event.detail._id)
      await loadData()
      wx.showToast({ title: '删除成功', icon: 'success' })
    }

    loadData()

    onShow(() => {
      loadData()
    })

    return {
      activeTab,
      categories,
      newCategory,
      onTabChange,
      handleFormChange,
      handleAdd,
      handleEdit,
      handleDelete,
    }
  },
})
