import { defineComponent } from '@vue-mini/core'

defineComponent({
  properties: {
    value: {
      type: null, // 允许字符串和数字
      value: '',
    },
  },
  setup(props, { triggerEvent }) {
    const onInput = (event) => {
      // 实时将输入值传递给父组件，不做任何处理
      triggerEvent('change', event.detail)
    }

    const onBlur = (event) => {
      let value = String(event.detail.value ?? '')

      // 如果值为空，则触发 change 并传递 null
      if (value === '' || value === '-') {
        triggerEvent('change', null)
        return
      }

      // 格式化数字，保留两位小数
      const numberValue = parseFloat(value)
      if (isNaN(numberValue)) {
        triggerEvent('change', null)
        return
      }

      const formattedValue = numberValue.toFixed(2)

      // 触发事件，将格式化后的值传递给父组件
      triggerEvent('change', formattedValue)
    }

    return {
      onInput,
      onBlur,
    }
  },
})
