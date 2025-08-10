import { ref } from '@vue-mini/core'
import { validate as _validate, register, setLocales, setOptions, zh } from 'robust-validator'
import { isEmpty as _isEmpty } from 'lodash'

setLocales(zh)
setOptions({ language: 'zh' })

function isEmpty(value) {
  return !_isEmpty(value)
}

register('notEmpty', isEmpty, {
  zh: '该字段是必须的.',
})

function requiredMoney(value) {
  return parseInt(parseFloat(value) * 100) !== 0
}

register('requiredMoney', requiredMoney, {
  zh: '该字段是必须的.',
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

  function clearErrors() {
    fields.value = {}
    errors.value = {}
  }

  function clearError(field) {
    if (fields.value) {
      fields.value[field] = true
    }
    if (errors.value) {
      delete errors.value[field]
    }
  }

  return {
    fields,
    errors,
    clearErrors,
    clearError,
    registerRule,
    validate,
  }
}

export const storeKey = Symbol('bill-form')
