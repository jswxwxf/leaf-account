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
      { name: '✍️ 记入多笔', value: 'batch' },
      { name: '📸 识图记帐', value: 'photo' },
      { name: '⌨️ 文字记帐', value: 'text' },
      // { name: '语音记帐', value: 'voice' },
      // { name: '导入文件', value: 'import' },
      { name: '⚖️ 余额对账', value: 'reconcile' },
      { name: '📊 今日汇总', value: 'today-summary' },
      { name: '📑 批量修改', value: 'batch-edit' },
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

