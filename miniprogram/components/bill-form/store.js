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
  if (!value) return false
  return parseInt(parseFloat(value) * 100) !== 0
}

register('requiredMoney', requiredMoney, {
  zh: '该字段是必须的.',
})

function isPositive(value) {
  return parseInt(parseFloat(value) * 100) > 0
}

register('positive', isPositive, {
  zh: '该字段是必须的.',
})

export default function store() {
  const rules = {}
  const fields = ref({})
  const errors = ref({})
  const extra = {}

  function registerRule(field, rule) {
    if (rule) {
      rules[field] = rule
    } else {
      delete rules[field]
    }
  }

  function clearRule() {
    // 清空所有规则
    for (const key in rules) {
      delete rules[key]
    }
  }

  async function validate(data) {
    return new Promise(async (resolve) => {
      // 给 parseMoney 一点时间
      setTimeout(async () => {
        const result = await _validate(data, rules)
        fields.value = result.fields
        errors.value = result.errors
        resolve(result)
      }, 500)
    })
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

  function setExtra(key, value) {
    extra[key] = value
  }

  return {
    fields,
    errors,
    extra,
    setExtra,
    clearErrors,
    clearError,
    registerRule,
    clearRule,
    validate,
  }
}

export const storeKey = Symbol('bill-form')
