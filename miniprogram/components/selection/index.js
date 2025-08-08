import { defineComponent, ref, watch } from '@vue-mini/core'

defineComponent({
  properties: {
    items: {
      type: Array,
      value: ['中心校区', '红旗校区', '东风校区', '共青城校区', 'CSDN奇妙方程式'],
    },
    value: {
      type: String,
      value: null,
    },
    placeholder: {
      type: String,
      value: '请选择校区',
    },
  },
  setup(props, { triggerEvent }) {
    const isDropdownOpen = ref(false)
    const selectedItem = ref(props.value)

    // 监听外部 value prop 的变化，并更新内部状态
    watch(
      () => props.value,
      (newValue) => {
        selectedItem.value = newValue
      },
    )

    const toggleDropdown = () => {
      isDropdownOpen.value = !isDropdownOpen.value
    }

    const selectItem = (e) => {
      const { item } = e.currentTarget.dataset
      selectedItem.value = item
      isDropdownOpen.value = false
      triggerEvent('change', item) // 使用 'change' 事件通知父组件
    }

    const handleDelete = () => {
      selectedItem.value = null
      isDropdownOpen.value = false
      triggerEvent('change', null) // 使用 'change' 事件通知父组件
    }

    return {
      isDropdownOpen,
      selectedItem,
      // props 会自动暴露给模板，所以不需要返回
      dropdownItems: props.items,
      // placeholder: props.placeholder,
      toggleDropdown,
      selectItem,
      handleDelete,
    }
  },
})
