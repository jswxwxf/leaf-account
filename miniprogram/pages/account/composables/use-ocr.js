import Toast from '@vant/weapp/toast/toast.js'

export function useOcr(onOcrResult) {
  let ocrRunning = false

  const runNativeOCR = async (imagePath) => {
    if (ocrRunning) {
      Toast('正在识别中，请稍候...')
      return
    }

    wx.showLoading({ title: 'AI解析中...' })
    ocrRunning = true

    try {
      const invokeRes = await wx.serviceMarket.invokeService({
        service: 'wx79ac3de8be320b71',
        api: 'OcrAllInOne',
        data: {
          // 用 CDN 方法标记要上传并转换成 HTTP URL 的文件
          img_url: new wx.serviceMarket.CDN({
            type: 'filePath',
            filePath: imagePath,
          }),
          data_type: 3,
          ocr_type: 8,
        },
      })

      console.log('invokeService success', invokeRes)
      wx.hideLoading()
      ocrRunning = false

      const resultData = invokeRes.data

      // 旧的实现返回一个简单的字符串数组
      // 我们需要将新结果适配为该格式
      // 假设 resultData.ocr_info 是一个包含 'text' 属性的对象数组
      const texts =
        resultData?.ocr_comm_res?.items
          ?.map((item) => item.text)
          .filter((line) => line && line.trim().length > 0) ?? []

      if (texts.length === 0) {
        Toast('未识别到任何文字')
        return
      }

      if (onOcrResult) {
        onOcrResult(texts)
      }
    } catch (err) {
      wx.hideLoading()
      ocrRunning = false
      console.error('invokeService fail', err)
      wx.showModal({
        title: '识别失败',
        content: JSON.stringify(err),
      })
    }
  }

  // 这些函数不再需要，但为了兼容性而保留
  // 以避免在调用组件中产生破坏性更改。它们什么都不做。
  const initVK = () => {}
  const stopVK = () => {}

  return {
    initVK, // 为 API 兼容性保留
    stopVK, // 为 API 兼容性保留
    runNativeOCR,
  }
}
