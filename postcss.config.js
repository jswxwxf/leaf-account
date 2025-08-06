module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // 下方为 px 转 rpx 区域
    'postcss-pxtransform': {
      platform: 'weapp',
      // 根据你的设计稿宽度进行配置
      // 可以传入一个 function
      // designWidth (input) {
      //   if (input.file.replace(/\\+/g, '/').indexOf('@nutui/nutui-taro') > -1) {
      //     return 375
      //   }
      //   return 750
      // },
      designWidth: 750, // 可以设置为 375 等等来应用下方的规则,
      deviceRatio: {
        640: 2.34 / 2,
        // 此时应用到的规则，代表 1px = 1rpx
        750: 1,
        828: 1.81 / 2,
        // 假如你把 designWidth 设置成 375 则使用这条规则 1px = 2rpx
        375: 2 / 1,
      },
    },
  },
}
