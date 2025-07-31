import { defineComponent, ref } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast'
// import { get } from '../../api/request.js'

function newTag() {
  return { name: '', type: '10' }
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const tags = ref([])
    const tag = ref(newTag())
    const selectedTags = ref([])

    let _resolve, _reject

    const handleTypeChange = (event) => {
      const { type } = event.currentTarget.dataset
      tag.value.type = type
    }

    const fetchTags = async () => {
      // Mock data for tags
      tags.value = [
        { name: '家庭', type: '10' },
        { name: '旅行', type: '20' },
        { name: '工作', type: '30' },
      ]
    }

    const show = (value = []) => {
      visible.value = true
      tag.value = newTag()
      selectedTags.value = [...value]
      fetchTags()
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
      const index = selectedTags.value.findIndex(selected => selected.name === item.name)

      if (index > -1) {
        selectedTags.value.splice(index, 1)
      } else {
        selectedTags.value.push(item)
      }
    }

    const onTagChange = (event) => {
      tag.value.name = event.detail
    }

    const handleAddNew = () => {
      const name = tag.value.name.trim()
      if (!name) return

      // 检查标签是否已存在
      const isExisting = tags.value.some(t => t.name === name) || selectedTags.value.some(t => t.name === name)
      if (isExisting) {
        Toast("标签已存在")
        return
      }

      const theTag = {
        name,
        type: tag.value.type,
      }

      // 添加到列表和选中项
      tags.value.push(theTag)
      selectedTags.value.push(theTag)

      // 清空输入框
      tag.value = newTag()
    }

    const handleConfirm = () => {
      hide()
      _resolve(selectedTags.value)
    }

    const utils = {
      isSelected(item, selectedTags) {
        if (!item || !selectedTags) return false
        return selectedTags.some(selected => selected.name === item.name)
      },
    }

    return {
      visible,
      tags,
      tag,
      selectedTags,
      show,
      handleClose,
      handleSelect,
      onTagChange,
      handleAddNew,
      handleTypeChange,
      handleConfirm,
      utils,
    }
  },
})
