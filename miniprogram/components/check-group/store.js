import { ref, watch } from '@vue-mini/core'

export default function store(props, { triggerEvent }) {
  const checkedValue = ref(props.value)

  const children = ref([])

  watch(
    () => props.value,
    (val) => {
      checkedValue.value = val
      updateChildren()
    },
  )

  const link = (child) => {
    children.value.push(child)
    updateChildren()
  }

  const unlink = (child) => {
    const index = children.value.indexOf(child)
    if (index > -1) {
      children.value.splice(index, 1)
    }
    updateChildren()
  }

  const change = (value) => {
    if (props.multiple) {
      const newValue = [...checkedValue.value]
      const index = newValue.indexOf(value)
      if (index > -1) {
        newValue.splice(index, 1)
      } else {
        newValue.push(value)
      }
      checkedValue.value = newValue
    } else {
      checkedValue.value = value
    }
    triggerEvent('change', checkedValue.value)
  }

  const updateChildren = () => {
    children.value.forEach((child) => {
      child.updateState()
    })
  }

  return {
    props,
    checkedValue,
    children,
    link,
    unlink,
    change,
    updateChildren,
  }
}

export const storeKey = Symbol('check-group')
