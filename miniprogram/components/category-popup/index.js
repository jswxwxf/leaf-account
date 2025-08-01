import { defineComponent, ref, onMounted } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import { getCategories, addCategory } from '@/api/category.js'

function newCategory() {
  return { name: '', type: '20' }
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const categories = ref([])
    const theNewCategory = ref(newCategory())

    let _resolve, _reject

    const fetchCategories = async () => {
      const res = await getCategories()
      categories.value = res.data || []
    }

    const show = () => {
      visible.value = true
      theNewCategory.value = newCategory()
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

    const onCategoryChange = (event) => {
      theNewCategory.value.name = event.detail
    }

    const toggleCategoryType = (event) => {
      theNewCategory.value.type = theNewCategory.value.type === '20' ? '10' : '20'
    }

    const handleAddNew = async () => {
      const name = theNewCategory.value.name.trim()
      if (!name) return

      // 检查是否已存在同名分类
      const isExisting = categories.value.some((c) => c.name === name)
      if (isExisting) {
        Toast('分类已存在')
        return
      }

      const res = await addCategory({ ...theNewCategory.value })
      if (res && res.data) {
        hide()
        // 返回包含 _id 的完整分类对象
        _resolve(res.data)
      } else {
        Toast.fail('添加失败')
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
function newFunction() {
  return { name: '', type: 'expense' }
}
