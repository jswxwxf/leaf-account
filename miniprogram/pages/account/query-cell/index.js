import { defineComponent, ref } from '@vue-mini/core'
import dayjs from 'dayjs'

defineComponent({
  properties: {},
  setup() {
    const queryData = ref({})

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
      if (field === 'endTime') {
        value = dayjs(e.detail).endOf('day').valueOf()
      }
      queryData.value[field] = value
    }

    return {
      queryData,
      handleFormChange,
    }
  },
})
