import { inject, watch } from '@vue-mini/core'
import { storeKey } from './store.js'

/**
 * A composable function for form items that works with @vue-mini/core.
 * It handles the registration of validation rules by injecting from the form context.
 *
 * @param {object} props - The component props, expected to contain 'field' and 'rule'.
 */
export function useFormItem(props) {
  const { registerRule, fields, errors } = inject(storeKey, {})

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

  return {
    fields,
    errors,
  }
}

export const formItemProps = (defaultName) => ({
  field: { type: String, value: defaultName },
  rule: { type: String },
  showError: { type: Boolean, value: true },
})
