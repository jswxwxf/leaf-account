import { defineComponent, ref, onMounted } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import { getCategories, addCategory } from '@/api/category.js'
import { newCategory } from '@/service/category-service.js'

function useNewCategory() {
  const theNewCategory = ref(newCategory())

  const onCategoryChange = (event) => {
    theNewCategory.value.name = event.detail
  }

  const toggleCategoryType = () => {
    theNewCategory.value.type = theNewCategory.value.type === '20' ? '10' : '20'
  }

  const resetNewCategory = () => {
    theNewCategory.value = newCategory()
  }

  const handleAddNew = async (categories) => {
    const name = theNewCategory.value.name.trim()
    if (!name) return null // 返回 null 表示无需操作

    // 检查是否已存在同名分类
    const isExisting = categories.some((c) => c.name === name)
    if (isExisting) {
      Toast('分类已存在')
      return null
    }

    const res = await addCategory({ ...theNewCategory.value })
    if (res && res.data) {
      // 返回包含 _id 的完整分类对象
      return res.data
    }
    // 抛出错误由调用方处理
    throw new Error('添加失败')
  }

  return {
    theNewCategory,
    onCategoryChange,
    toggleCategoryType,
    resetNewCategory,
    handleAddNew,
  }
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const categories = ref([])
    const {
      theNewCategory,
      onCategoryChange,
      toggleCategoryType,
      resetNewCategory,
      handleAddNew: addNewCategoryService, // 重命名以区分
    } = useNewCategory()

    let _resolve, _reject

    const fetchCategories = async () => {
      const res = await getCategories()
      categories.value = res.data || []
    }

    const show = () => {
      visible.value = true
      resetNewCategory()
      fetchCategories()
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const hide = () => {
      visible.value = false
    }

    const handleClose = () => {
      hide()
      _reject(new Error('用户取消'))
    }

    const handleSelect = (event) => {
      const { item } = event.currentTarget.dataset
      hide()
      _resolve(item)
    }

    const handleAddNew = async () => {
      try {
        const savedCategory = await addNewCategoryService(categories.value)
        if (savedCategory) {
          hide()
          _resolve(savedCategory)
        }
      } catch (e) {
        Toast.fail(e.message)
      }
    }

    return {
      visible,
      categories,
      theNewCategory,
      show,
      handleClose,
      handleSelect,
      onCategoryChange,
      toggleCategoryType,
      handleAddNew,
    }
  },
})
