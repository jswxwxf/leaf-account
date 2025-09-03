import { defineComponent, computed } from '@vue-mini/core'

defineComponent({
  externalClasses: ['custom-class'],
  properties: {
    item: {
      type: Object,
      value: {},
    },
    disabled: {
      type: Boolean,
      value: false,
    },
    selected: {
      type: Boolean,
      value: false,
    },
    touched: {
      type: Boolean,
      value: false,
    },
  },
  setup(props, { triggerEvent }) {
    const buttonType = computed(() => {
      // '20' for expense, '10' for income
      return props.item.type === '10' ? 'income' : 'expense'
    })

    const onTap = (e) => {
      triggerEvent('category-tap', e)
    }

    return {
      buttonType,
      onTap,
    }
  },
})
