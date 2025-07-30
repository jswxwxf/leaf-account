import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  properties: {
    hidden: {
      type: Boolean,
      value: false,
    },
  },
  externalClasses: ['custom-class'],
  setup(props, { triggerEvent }) {
    const actions = ref([
      { name: '记入多笔', value: 'batch' },
      { name: '拍照记帐', value: 'camera' },
      { name: '识别图片', value: 'image' },
      { name: '导入文件', value: 'import' },
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
