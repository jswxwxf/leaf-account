import { defineComponent, ref } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast'
import { getTags, addTags } from '@/api/tag.js'

function newTag() {
  return { name: '', type: '10' }
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const tags = ref([])
    const theNewTag = ref(newTag())
    const selectedTags = ref([])

    let _resolve, _reject

    const handleTypeChange = (event) => {
      const { type } = event.currentTarget.dataset
      theNewTag.value.type = type
    }

    const fetchTags = async () => {
      const res = await getTags()
      tags.value = res.data || []
    }

    const show = (value = []) => {
      visible.value = true
      theNewTag.value = newTag()
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
      const index = selectedTags.value.findIndex((selected) => selected.name === item.name)

      if (index > -1) {
        selectedTags.value.splice(index, 1)
      } else {
        selectedTags.value.push(item)
      }
    }

    const onTagChange = (event) => {
      theNewTag.value.name = event.detail
    }

    const handleAddNew = () => {
      const name = theNewTag.value.name.trim()
      if (!name) return

      // 检查标签是否已存在
      const isExisting =
        tags.value.some((t) => t.name === name) || selectedTags.value.some((t) => t.name === name)
      if (isExisting) {
        Toast('标签已存在')
        return
      }

      const theTag = {
        name,
        type: theNewTag.value.type,
      }

      // 添加到列表和选中项
      tags.value.push(theTag)
      selectedTags.value.push(theTag)

      // 清空输入框
      theNewTag.value = newTag()
    }

    const handleConfirm = async () => {
      // 找出所有新创建的（没有_id）并且被选中的标签
      const newTagsToCreate = selectedTags.value.filter((t) => !t._id)

      let savedNewTags = []
      if (newTagsToCreate.length > 0) {
        // 调用云函数批量保存
        const res = await addTags(newTagsToCreate)
        if (res && res.data) {
          savedNewTags = res.data
        } else {
          Toast.fail('保存新标签失败')
          return
        }
      }

      // 合并：已有的 + 新保存的
      const finalSelectedTags = selectedTags.value
        .filter((t) => t._id) // 先拿出所有已存在的
        .concat(savedNewTags) // 再加上刚刚保存成功的

      hide()
      _resolve(finalSelectedTags)
    }

    const utils = {
      isSelected(item, selectedTags) {
        if (!item || !selectedTags) return false
        return selectedTags.some((selected) => selected.name === item.name)
      },
    }

    return {
      visible,
      tags,
      theNewTag,
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
