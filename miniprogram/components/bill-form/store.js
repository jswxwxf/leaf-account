import { ref } from '@vue-mini/core'
import { validate as _validate, setLocales, setOptions, zh } from 'robust-validator'

setLocales(zh)
setOptions({ language: 'zh' })

export default function store() {
  const rules = {}
  const fields = ref({})
  const errors = ref({})

  function registerRule(field, rule) {
    if (rule) {
      rules[field] = rule
    } else {
      delete rules[field]
    }
  }

  async function validate(data) {
    const result = await _validate(data, rules)
    fields.value = result.fields
    errors.value = result.errors
    return result
  }

  return {
    registerRule,
    fields,
    errors,
    validate,
  }
}

export const storeKey = Symbol('bill-form')
