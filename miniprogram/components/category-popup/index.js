import { defineComponent, ref, onMounted } from '@vue-mini/core'
import { get } from '../../api/request.js'

function newCategory() {
  return { name: '', type: 'expense' }
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const categories = ref([])
    const category = ref(newCategory())

    let _resolve, _reject

    const fetchCategories = async () => {
      // try {
      //   const res = await get('/category', { limit: 100 })
      //   categories.value = res.data || []
      // } catch (error) {
      //   console.error('获取分类列表失败', error)
      categories.value = [
        { name: '餐饮', type: '00' },
        { name: '交通', type: '00' },
        { name: '购物', type: '00' },
        { name: '收入', type: '10' },
      ]
      // }
    }

    const show = () => {
      visible.value = true
      category.value = newCategory()
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
      const { name } = event.currentTarget.dataset
      hide()
      _resolve(name)
    }

    const onCategoryChange = (event) => {
      category.value.name = event.detail
    }

    const toggleCategoryType = (event) => {
      category.value.type = category.value.type === 'expense' ? 'income' : 'expense'
    }

    const handleAddNew = () => {
      const name = category.value.name.trim()
      if (!name) return
      hide()
      // 返回整个对象
      _resolve({ ...category.value })
    }

    return {
      visible,
      categories,
      category,
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
