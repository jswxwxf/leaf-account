import { defineComponent, ref, onMounted, onReady } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'
import { getCategories, addCategory } from '@/api/category.js'
import { newCategory } from '@/service/category-service.js'
import { showAccountSelector } from '@/utils/helper.js'
import { onTabChange } from '@/utils/index.js'

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

  const addNewCategory = async (categories) => {
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
    addNewCategory,
  }
}

defineComponent({
  setup(props, { triggerEvent, selectComponent }) {
    const visible = ref(false)
    const categories = ref([])
    const errors = ref()
    const categoryForm = ref()
    const options = ref({})

    const {
      theNewCategory,
      onCategoryChange,
      toggleCategoryType,
      resetNewCategory,
      addNewCategory,
    } = useNewCategory()

    let _resolve, _reject

    onReady(() => {
      categoryForm.value = selectComponent('#category-form')
    })

    const fetchCategories = async () => {
      let query
      if (options.value.disableType) {
        query = { type: options.value.disableType === '20' ? '10' : '20' }
      }
      const res = await getCategories(query)
      categories.value = res.data || []
    }

    fetchCategories()

    onTabChange(() => {
      handleClose()
    })

    const show = (opts = {}) => {
      options.value = opts
      visible.value = true
      resetNewCategory()
      fetchCategories()
      categoryForm.value.clearErrors()
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
      _reject && _reject(new Error('用户取消'))
    }

    const handleSelect = async (event) => {
      let { item } = event.currentTarget.dataset
      if (item.name === '转账') {
        if (options.value.disableTransfer) return
        const account = await showAccountSelector()
        // account 可能为空是因为如果只有一个账户，选择器可能不会弹出
        if (account) {
          item = { ...item, account, note: `向 ${account.title} 转账` }
        }
      }
      if (item.name === '收转账') {
        if (options.value.disableTransfer) return
        const account = await showAccountSelector()
        // account 可能为空是因为如果只有一个账户，选择器可能不会弹出
        if (account) {
          item = { ...item, account, note: `从 ${account.title} 转入` }
        }
      }
      hide()
      _resolve(item)
    }

    const handleAddNew = async () => {
      const result = await categoryForm.value.validate(theNewCategory.value)
      if (result.isInvalid) {
        return
      }

      const savedCategory = await addNewCategory(categories.value)
      if (savedCategory) {
        hide()
        _resolve(savedCategory)
      }
    }

    const handleFormInit = (e) => {
      e.detail.registerRule('name', 'required|max:4')
      errors.value = e.detail.errors
    }

    return {
      visible,
      categories,
      theNewCategory,
      errors,
      options,
      show,
      handleClose,
      handleSelect,
      onCategoryChange,
      toggleCategoryType,
      handleAddNew,
      handleFormInit,
    }
  },
})
