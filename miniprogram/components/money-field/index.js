import { defineComponent, ref, watch } from '@vue-mini/core'
import { formatMoney, parseMoney } from '@/utils/index.js'
import { useFormItem, formItemProps } from '../bill-form/use-form-item.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '金额',
    },
    value: {
      type: null, // 允许字符串和数字
      value: '',
    },
    placeholder: {
      type: String,
      value: '请输入金额，支持简单运算',
    },
    ...formItemProps('amount'),
  },
  setup(props, { triggerEvent }) {
    const formState = useFormItem(props)
    const { clearError } = formState
    const isFocused = ref(false)
    const displayValue = ref('')

    // 监听外部传入的 value，并更新 displayValue
    watch(
      () => props.value,
      (newValue) => {
        if (isFocused.value) return // 聚焦时，用户正在输入，不进行格式化
        const num = parseMoney(newValue)
        displayValue.value = isNaN(num) ? '' : formatMoney(num)
      },
      { immediate: true },
    )

    const onFocus = () => {
      clearError()
      isFocused.value = true
      // 聚焦时，显示原始数值以便编辑
      const num = parseMoney(props.value)
      displayValue.value = isNaN(num) ? '' : String(num)
    }

    const onBlur = (event) => {
      isFocused.value = false
      const rawValue = event.detail.value
      const num = parseMoney(rawValue)

      if (isNaN(num)) {
        displayValue.value = ''
        triggerEvent('change', 0) // 当输入无效时，派发 0
      } else {
        displayValue.value = formatMoney(num)
        triggerEvent('change', num) // 派发纯净的数值
      }
    }

    return {
      ...formState,
      displayValue,
      onFocus,
      onBlur,
    }
  },
})
