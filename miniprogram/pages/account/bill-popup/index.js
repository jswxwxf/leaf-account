import { defineComponent } from '@vue-mini/core'

defineComponent({
  data: {
    visible: false,
    list: Array.from({ length: 5 }, () => ({
      date: '',
      category: '',
      amount: '',
      note: '',
      tags: '',
    })),
  },
  methods: {
    show() {
      this.setData({ visible: true })
    },
    handleClose() {
      this.setData({ visible: false })
    },
    handleFormChange(e) {
      const { rowIndex, field } = e.currentTarget.dataset
      const { value } = e.detail
      this.setData({
        [`list[${rowIndex}].${field}`]: value,
      })
    },
  },
})
