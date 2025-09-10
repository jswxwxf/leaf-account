import { defineComponent, ref, onShow, onReady } from '@vue-mini/core'
import Dialog from '@vant/weapp/dialog/dialog'
import { groupBy } from 'lodash'
import { addTag, getTags, deleteTag, updateTag } from '@/api/tag.js'
import { newTag } from '@/service/tag-service.js'

defineComponent({
  setup(props, { selectComponent }) {
    const tags = ref()
    const theNewTag = ref(newTag())
    const tagPopup = ref()

    onReady(() => {
      tagPopup.value = selectComponent('#tag-popup')
    })

    const handleFormChange = (e) => {
      theNewTag.value = e.detail
    }

    async function loadData() {
      const res = await getTags()
      tags.value = res.data || []
    }

    const handleAdd = async () => {
      await addTag({ ...theNewTag.value })
      wx.showToast({ title: '添加成功', icon: 'success' })

      theNewTag.value = newTag()
      await loadData()
    }

    const handleEdit = async (event) => {
      const updatedTag = await tagPopup.value.show(event.detail)
      await updateTag(updatedTag)
      await loadData()
      wx.showToast({ title: '更新成功', icon: 'success' })
    }

    const handleDelete = async (event) => {
      await Dialog.confirm({
        title: '确认删除',
        message: '删除后将无法恢复，是否继续？',
      })
      await deleteTag(event.detail._id)
      await loadData()
      wx.showToast({ title: '删除成功', icon: 'success' })
    }

    onShow(() => {
      loadData()
    })

    return {
      tags,
      theNewTag,
      handleFormChange,
      handleAdd,
      handleEdit,
      handleDelete,
    }
  },
})
