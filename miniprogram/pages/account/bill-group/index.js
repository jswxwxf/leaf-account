import { defineComponent } from '@vue-mini/core'

defineComponent({
  // 在 defineComponent 中使用小程序原生的 properties 定义属性
  properties: {
    item: {
      type: Object,
      value: {},
    },
  },
  // setup 函数可以接收到 props，但不需要再返回 props
  // properties 中定义的属性会自动挂载到模板上
  setup(props) {
    // 可以在这里对 props 进行逻辑处理，比如打印日志
    // console.log(props.item)
    return {}
  },
})
