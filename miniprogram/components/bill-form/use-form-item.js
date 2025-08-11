import { inject, watch } from '@vue-mini/core'
import { storeKey } from './store.js'

/**
 * A composable function for form items that works with @vue-mini/core.
 * It handles the registration of validation rules by injecting from the form context.
 *
 * @param {object} props - The component props, expected to contain 'field' and 'rule'.
 */
export function useFormItem(props) {
  const { registerRule, fields, errors, clearError: _clearError } = inject(storeKey, {})

  if (!registerRule) {
    // If not wrapped in a form, do nothing.
    return
  }

  watch(
    () => props.rule,
    (rule) => {
      registerRule(props.field, rule)
    },
    {
      immediate: true,
    },
  )

  const clearError = () => {
    // 如果不显示错误信息，则需要在获得焦点的时候清除错误状态
    // 以免用户输入的字符因为错误状态而变成红色
    if (!props.showError) {
      _clearError(props.field)
    }
  }

  return {
    fields,
    errors,
    clearError,
  }
}

export const formItemProps = (defaultName) => ({
  field: { type: String, value: defaultName },
  rule: { type: String },
  showError: { type: Boolean, value: true },
})
