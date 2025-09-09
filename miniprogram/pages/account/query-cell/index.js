import { defineComponent, inject, ref } from '@vue-mini/core'
import dayjs from 'dayjs'
import { storeKey } from '../store'

defineComponent({
  properties: {},
  setup() {
    const { queryData: _queryData, queryDropDownClosed } = inject(storeKey)
    const queryData = ref({ ..._queryData.value })

    const handleFormChange = (e) => {
      const { field } = e.currentTarget.dataset
      let value = e.detail
      if (field === 'endTime') {
        value = dayjs(e.detail).endOf('day').valueOf()
      }
      queryData.value[field] = value
    }

    const handleExcludeChange = (e) => {
      queryData.value.excludeTag = e.detail
      queryData.value.exclude = !queryData.value.excludeTag
    }

    const handleQuery = () => {
      _queryData.value = { ...queryData.value }
      queryDropDownClosed.value = Date.now()
    }

    const clearQueryData = () => {
      queryData.value = { ..._queryData.value }
    }

    const handleReset = () => {
      queryData.value = {}
    }

    return {
      queryData,
      handleFormChange,
      handleExcludeChange,
      clearQueryData,
      handleQuery,
      handleReset,
    }
  },
})
