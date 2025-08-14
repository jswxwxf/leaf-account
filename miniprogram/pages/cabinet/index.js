import { defineComponent, ref } from '@vue-mini/core'

defineComponent({
  setup() {
    // 9 个帐本，分别绑定 9 张叶子背景图
    const books = ref([
      { id: 1, title: '流水帐', img: '../../assets/images/leaf-maple.jpg', totalIncome: 3340, totalExpense: 3530, balance: 10 },
      { id: 2, title: '微信', img: '../../assets/images/leaf-ginkgo.jpg', totalIncome: 5320, totalExpense: 330, balance: 3240 },
      { id: 3, title: '支付宝', img: '../../assets/images/leaf-lotus.jpg', totalIncome: 3010, totalExpense: 340, balance: 2350 },
      { id: 4, title: '工商银行', img: '../../assets/images/leaf-banana.jpg', totalIncome: 1323530, totalExpense: 40, balance: 123430 },
      { id: 5, title: '招商银行', img: '../../assets/images/leaf-mulberry.jpg', totalIncome: 30, totalExpense: 0, balance: 30 },
      { id: 6, title: '江苏银行', img: '../../assets/images/leaf-pine.jpg', totalIncome: 0, totalExpense: 0, balance: 0 },
      { id: 7, title: '芦苇帐本', img: '../../assets/images/leaf-reed.jpg', totalIncome: 0, totalExpense: 0, balance: 0 },
      { id: 8, title: '柳叶帐本', img: '../../assets/images/leaf-willow.jpg', totalIncome: 0, totalExpense: 0, balance: 0 },
      { id: 9, title: '梧桐帐本', img: '../../assets/images/leaf-phoenix.jpg', totalIncome: 0, totalExpense: 0, balance: 0 },
    ])

    return {
      books,
    }
  },
})
