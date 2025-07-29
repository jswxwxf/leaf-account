import { defineComponent } from '@vue-mini/core'

defineComponent({
  data: {
    visible: false,
  },
  methods: {
    show() {
      this.setData({ visible: true })
    },
    handleClose() {
      this.setData({ visible: false })
    },
  },
})
