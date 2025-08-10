import { defineComponent, ref, reactive } from '@vue-mini/core'

defineComponent({
  setup() {
    const activeTab = ref(0)
    const categories = reactive({
      expense: [
        '餐饮', '交通', '服饰', '购物', '服务', '教育', '娱乐', '运动',
        '生活缴费', '旅行', '宠物', '医疗', '保险', '公益', '发红包', '转账',
        '餐饮', '交通', '服饰', '购物', '服务', '教育', '娱乐', '运动',
        '生活缴费', '旅行', '宠物', '医疗', '保险', '公益', '发红包', '转账',
        '餐饮', '交通', '服饰', '购物', '服务', '教育', '娱乐', '运动',
        '生活缴费', '旅行', '宠物', '医疗', '保险', '公益', '发红包', '转账'
      ],
      income: [
        '工资', '兼职', '理财', '红包', '其他'
      ]
    })

    const onTabChange = (event) => {
      activeTab.value = event.detail.index
    }

    return {
      activeTab,
      categories,
      onTabChange,
    }
  },
})
