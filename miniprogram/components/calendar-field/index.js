import { defineComponent, computed } from '@vue-mini/core'
import { formatDate } from '@/utils/date.js'
import { showCalendar } from '@/utils/helper.js'
import { useFormItem, formItemProps } from '../bill-form/use-form-item.js'

defineComponent({
  properties: {
    label: {
      type: String,
      value: '日期',
    },
    value: {
      type: [Number, Date], // Allow both timestamp and Date object
      value: Date.now(),
    },
    type: {
      type: String,
      value: 'long', // 'long' or 'short'
    },
    placeholder: {
      type: String,
      value: '请选择日期',
    },
    border: {
      type: Boolean,
      value: true,
    },
    disabled: {
      type: Boolean,
      value: false
    },
    ...formItemProps('datetime'),
  },

  setup(props, { triggerEvent }) {
    const formState = useFormItem(props)
    const { clearError } = formState

    const formattedDate = computed(() => {
      if (!props.value) return ''
      const format = props.type === 'short' ? 'MM/DD' : 'YYYY-MM-DD'
      return formatDate(props.value, format)
    })

    const handleClick = async () => {
      if (props.disabled) return
      clearError()
      const result = await showCalendar(props.value)
      triggerEvent('change', result)
    }

    return {
      ...formState,
      formattedDate,
      handleClick,
    }
  },
})
