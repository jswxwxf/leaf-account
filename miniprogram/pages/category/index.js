import { defineComponent, ref, onShow, onReady } from '@vue-mini/core'
import Dialog from '@vant/weapp/dialog/dialog'
import { groupBy } from 'lodash'
import { addCategory, getCategories, deleteCategory, updateCategory } from '@/api/category.js'

defineComponent({
  setup(props, { selectComponent }) {
    const activeTab = ref('20')
    const categories = ref({
      expense: undefined,
      income: undefined,
    })
    const newCategory = ref({ name: '' })
    const categoryPopup = ref()

    onReady(() => {
      categoryPopup.value = selectComponent('#category-popup')
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
      const type = activeTab.value
      await addCategory({ ...newCategory.value, type })
      wx.showToast({ title: '添加成功', icon: 'success' })

      newCategory.value = { name: '' }
      await loadData()
    }

    const handleEdit = async (event) => {
      const updatedCategory = await categoryPopup.value.show(event.detail)
      await updateCategory(updatedCategory)
      await loadData()
      wx.showToast({ title: '更新成功', icon: 'success' })
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
