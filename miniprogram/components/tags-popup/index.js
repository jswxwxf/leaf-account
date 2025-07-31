import { defineComponent, ref } from '@vue-mini/core'
// import { get } from '../../api/request.js'

function newTag() {
  return { name: '' }
}

defineComponent({
  setup(props, { triggerEvent }) {
    const visible = ref(false)
    const tags = ref([])
    const tag = ref(newTag())

    let _resolve, _reject

    const fetchTags = async () => {
      // Mock data for tags
      tags.value = [
        { name: '家庭' },
        { name: '旅行' },
        { name: '工作' },
      ]
    }

    const show = () => {
      visible.value = true
      tag.value = newTag()
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
      const { name } = event.currentTarget.dataset
      hide()
      _resolve(name)
    }

    const onTagChange = (event) => {
      tag.value.name = event.detail
    }

    const handleAddNew = () => {
      const name = tag.value.name.trim()
      if (!name) return
      hide()
      _resolve(name)
    }

    return {
      visible,
      tags,
      tag,
      show,
      handleClose,
      handleSelect,
      onTagChange,
      handleAddNew,
    }
  },
})
