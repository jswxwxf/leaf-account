import { defineComponent, ref } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast'
import { getTags } from '@/api/tag.js'
import { newTag, saveTags } from '@/service/tag-service.js'

function useNewTag(tags, selectedTags) {
  const theNewTag = ref(newTag())

  const handleTypeChange = (event) => {
    const { type } = event.currentTarget.dataset
    theNewTag.value.type = type
  }

  const onTagChange = (event) => {
    theNewTag.value.name = event.detail
  }

  const handleAddNew = () => {
    const name = theNewTag.value.name.trim()
    if (!name) return

    // 检查标签是否已存在于总列表中
    const isExisting = tags.value.some((t) => t.name === name)
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

  const resetNewTag = () => {
    theNewTag.value = newTag()
  }

  return {
    theNewTag,
    handleTypeChange,
    onTagChange,
    handleAddNew,
    resetNewTag,
  }
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const tags = ref([])
    const selectedTags = ref([])

    let _resolve, _reject

    const { theNewTag, handleTypeChange, onTagChange, handleAddNew, resetNewTag } = useNewTag(
      tags,
      selectedTags,
    )

    const fetchTags = async () => {
      const res = await getTags()
      tags.value = res.data || []
    }

    const show = (value = []) => {
      visible.value = true
      selectedTags.value = [...value]
      resetNewTag()
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

    const handleConfirm = async () => {
      try {
        // 找出所有新创建的（没有_id）并且被选中的标签
        const newTagsToCreate = selectedTags.value.filter((t) => !t._id)
        const savedNewTags = await saveTags(newTagsToCreate)

        // 合并：已有的 + 新保存的
        const finalSelectedTags = selectedTags.value
          .filter((t) => t._id) // 先拿出所有已存在的
          .concat(savedNewTags) // 再加上刚刚保存成功的

        hide()
        _resolve(finalSelectedTags)
      } catch (e) {
        Toast.fail(e.message || '保存失败')
      }
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
    }
  },
})
