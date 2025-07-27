import { defineComponent, ref, reactive, computed } from '@vue-mini/core'

defineComponent({
  setup() {
    const typeOptions = ref([
      { text: '全部类型', value: 0 },
      { text: '支出', value: 1 },
      { text: '收入', value: 2 },
    ])
    const typeValue = ref(0)

    const dateOptions = ref([
      { text: '2025年7月', value: 0 },
      { text: '2025年6月', value: 1 },
      { text: '2025年5月', value: 2 },
    ])
    const dateValue = ref(0)

    const totalExpense = ref(3393.84)
    const totalIncome = ref(1401.60)

    const dailyBills = reactive([
      {
        date: '7月24日',
        day: '昨天',
        income: '0.00',
        expense: '183.51',
        bills: [
          {
            category: '购物',
            icon: 'shopping-cart-o',
            time: '19:57',
            note: '拼多多多平台商户',
            amount: -159.00,
            tags: ['非日常'],
          },
          {
            category: '购物',
            icon: 'shopping-cart-o',
            time: '16:47',
            note: '拼多多多平台商户',
            amount: -24.51,
            tags: ['日常'],
          },
        ],
      },
      {
        date: '7月23日',
        day: '星期三',
        income: '101.50',
        expense: '112.62',
        bills: [
          {
            category: '商家转账',
            icon: 'shop-o',
            time: '21:35',
            note: '拼多多多-打开拼多多，领更多优惠',
            amount: 0.50,
            tags: ['日常'],
          },
          {
            category: '购物',
            icon: 'shopping-cart-o',
            time: '21:35',
            note: '拼多多多平台商户',
            amount: -2.92,
            tags: ['日常', '非日常'],
          },
          {
            category: '服务',
            icon: 'service-o',
            time: '21:35',
            note: '腾讯',
            amount: -1.00,
          },
        ],
      },
    ])

    return {
      typeOptions,
      typeValue,
      dateOptions,
      dateValue,
      dailyBills,
      totalExpense,
      totalIncome,
    }
  },
})
