import { defineComponent, ref, onMounted } from '@vue-mini/core'
import { get } from '../../api/request.js'

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const categories = ref([])
    const newCategory = ref('')

    let _resolve, _reject

    const fetchCategories = async () => {
      // try {
      //   const res = await get('/category', { limit: 100 })
      //   categories.value = res.data || []
      // } catch (error) {
      //   console.error('获取分类列表失败', error)
      categories.value = [{ name: '餐饮' }, { name: '交通' }, { name: '购物' }]
      // }
    }

    const show = () => {
      visible.value = true
      newCategory.value = ''
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

    const onNewCategoryChange = (event) => {
      newCategory.value = event.detail
    }

    const handleAddNew = () => {
      const name = newCategory.value.trim()
      if (!name) return
      hide()
      _resolve(name)
    }

    return {
      visible,
      categories,
      newCategory,
      show,
      handleClose,
      handleSelect,
      onNewCategoryChange,
      handleAddNew,
    }
  },
})
