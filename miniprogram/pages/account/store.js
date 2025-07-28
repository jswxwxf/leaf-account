import { ref } from '@vue-mini/core'

export default function store() {
  const dailyBills = ref([
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
          amount: -159.0,
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
          amount: 0.5,
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
          amount: -1.0,
        },
      ],
    },
  ])

  const typeValue = ref(0)
  const dateValue = ref(0)

  const totalExpense = ref(3393.84)
  const totalIncome = ref(1401.6)

  return {
    dailyBills,
    typeValue,
    dateValue,
    totalExpense,
    totalIncome,
  }
}

export const storeKey = Symbol('account-store')
