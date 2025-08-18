import { defineComponent, ref, watch } from '@vue-mini/core'

defineComponent({
  properties: {
    items: {
      type: Array,
      value: [],
    },
    value: {
      type: null, // 可以是字符串或对象
      value: null,
    },
    placeholder: {
      type: String,
      value: '请选择',
    },
    // 新增属性，用于从对象中取值的 key
    itemKey: {
      type: String,
      value: '_id',
    },
    valueKey: {
      type: String,
      value: 'text',
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
      triggerEvent('change', item) // 直接传递整个 item
    }

    const handleDelete = () => {
      selectedItem.value = null
      isDropdownOpen.value = false
      triggerEvent('change', null)
    }

    return {
      isDropdownOpen,
      selectedItem,
      toggleDropdown,
      selectItem,
      handleDelete,
    }
  },
})
