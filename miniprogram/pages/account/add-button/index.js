import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  properties: {
    hidden: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent }) {
    const actions = ref([
      { text: '记多笔', value: 'batch' },
      { text: '拍照记帐', value: 'camera' },
      { text: '识别图片', value: 'image' },
      { text: '导入文件', value: 'import' },
    ])

    const handleMainClick = (e) => {
      triggerEvent('click', e)
    }

    const handleActionSelect = (action) => {
      triggerEvent('select', action)
    }

    return {
      actions,
      handleMainClick,
      handleActionSelect,
    }
  },
})
