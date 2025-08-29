import { defineComponent, ref, onReady } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast'
import { getTags } from '@/api/tag.js'
import { newTag, saveTags } from '@/service/tag-service.js'
import { onTabChange } from '@/utils/index.js'

function useNewTag(tags, selectedTags, tagForm) {
  const theNewTag = ref(newTag())

  const handleTypeChange = (event) => {
    const { type } = event.currentTarget.dataset
    theNewTag.value.type = type
  }

  const onTagChange = (event) => {
    theNewTag.value.name = event.detail
  }

  const handleAddNew = async () => {
    const result = await tagForm.value.validate(theNewTag.value)
    if (result.isInvalid) {
      return
    }

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
    tagForm.clearErrors()
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
  setup(props, { triggerEvent, selectComponent }) {
    const visible = ref(false)
    const tags = ref([])
    const selectedTags = ref([])
    const errors = ref()
    const tagForm = ref()

    let _resolve, _reject

    const { theNewTag, handleTypeChange, onTagChange, handleAddNew, resetNewTag } = useNewTag(
      tags,
      selectedTags,
      tagForm,
    )

    onReady(() => {
      tagForm.value = selectComponent('#tag-form')
    })

    const fetchTags = async () => {
      const res = await getTags()
      tags.value = res.data || []
    }

    fetchTags()

    onTabChange(() => {
      handleClose()
    })

    const show = (value = []) => {
      visible.value = true
      selectedTags.value = [...value]
      resetNewTag()
      fetchTags()
      tagForm.value.clearErrors()
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

    const handleSelect = (event) => {
      const item = event.detail
      const index = selectedTags.value.findIndex((selected) => selected.name === item.name)

      if (index > -1) {
        selectedTags.value.splice(index, 1)
      } else {
        selectedTags.value.push(item)
      }
    }

    const handleConfirm = async () => {
      // 找出所有新创建的（没有_id）并且被选中的标签
      const newTagsToCreate = selectedTags.value.filter((t) => !t._id)
      const savedNewTags = await saveTags(newTagsToCreate)

      // 合并：已有的 + 新保存的
      const finalSelectedTags = selectedTags.value
        .filter((t) => t._id) // 先拿出所有已存在的
        .concat(savedNewTags) // 再加上刚刚保存成功的

      hide()
      _resolve(finalSelectedTags)
    }

    const handleFormInit = (e) => {
      e.detail.registerRule('name', 'required|max:4')
      errors.value = e.detail.errors
    }

    return {
      visible,
      tags,
      theNewTag,
      selectedTags,
      errors,
      show,
      handleClose,
      handleSelect,
      onTagChange,
      handleAddNew,
      handleTypeChange,
      handleConfirm,
      handleFormInit,
    }
  },
})
