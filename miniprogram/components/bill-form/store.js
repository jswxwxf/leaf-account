import { ref } from '@vue-mini/core'
import { validate as _validate, register, setLocales, setOptions, zh } from 'robust-validator'
import { isEmpty } from 'lodash'

setLocales(zh)
setOptions({ language: 'zh' })

const isNotEmpty = (value) => {
  return !isEmpty(value)
}

register('notEmpty', isNotEmpty, {
  zh: "该字段是必须的.",
})

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
