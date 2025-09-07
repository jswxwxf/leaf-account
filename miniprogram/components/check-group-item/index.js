import { defineComponent, ref, inject, onDetach } from '@vue-mini/core'
import { storeKey } from '../check-group/store'

export default defineComponent({
  properties: {
    title: {
      type: String,
    },
    value: {
      type: [String, Number, Array],
      value: '',
    },
  },
  setup(props) {
    const parent = inject(storeKey)
    const active = ref(false)

    const updateState = () => {
      if (parent) {
        if (parent.props.multiple) {
          active.value = parent.checkedValue.value.includes(props.value)
        } else {
          active.value = parent.checkedValue.value === props.value
        }
      }
    }

    const onClick = () => {
      if (parent) {
        parent.change(props.value)
      }
    }

    const child = { updateState }

    parent?.link(child)
    updateState()

    onDetach(() => {
      parent?.unlink(child)
    })

    return {
      parent,
      active,
      onClick,
    }
  },
})
