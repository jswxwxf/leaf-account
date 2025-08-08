import { validate as _validate, setLocales, setOptions, zh } from 'robust-validator'

setLocales(zh)
setOptions({ language: 'zh' })

export default function store() {
  const rules = {}

  function registerRule(field, rule) {
    if (rule) {
      rules[field] = rule
    } else {
      delete rules[field]
    }
  }

  async function validate(data) {
    const result = await _validate(data, rules)
    console.log(result)
    return result.isValid
  }

  return {
    registerRule,
    validate,
  }
}

export const storeKey = Symbol('bill-form')
