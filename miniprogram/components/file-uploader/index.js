import { defineComponent, ref, getCurrentInstance } from '@vue-mini/core'
import { promisic } from '@/utils/index.js'

defineComponent({
  properties: {
    // 允许的文件扩展名
    extension: {
      type: Array,
      value: [],
    },
  },
  setup(props, { triggerEvent }) {
    const fileName = ref('')

    const onTap = async () => {
      try {
        const res = await promisic(wx.chooseMessageFile)({
          count: 1,
          type: 'file',
          extension: props.extension,
        })
        const file = res.tempFiles[0]
        fileName.value = file.name

        // 触发 change 事件，并把文件路径和文件名传出去
        triggerEvent('change', {
          name: file.name,
          path: file.path,
        })
      } catch (err) {
        console.error('选择文件失败', err)
      }
    }

    const reset = () => {
      fileName.value = ''
    }

    return {
      fileName,
      onTap,
      reset,
    }
  },
})
