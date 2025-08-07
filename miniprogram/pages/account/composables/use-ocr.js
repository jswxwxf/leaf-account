import { onUnload } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast.js'

export function useOcr(onOcrResult) {
  let session = null
  let ocrRunning = false

  const initVK = () => {
    if (session) return

    const ocrSession = wx.createVKSession({
      track: {
        OCR: {
          mode: 2,
        },
      },
      version: 'v1',
    })

    ocrSession.on('error', (err) => {
      console.error('VKSession error:', err)
      Toast.fail('OCR引擎出错')
      ocrRunning = false
      wx.hideLoading()
    })

    ocrSession.on('updateAnchors', (anchors) => {
      wx.hideLoading()
      ocrRunning = false
      if (!anchors || anchors.length === 0) {
        Toast('未识别到任何文字')
        return
      }

      const texts = anchors.map((anchor) => anchor.text)
      if (onOcrResult) {
        onOcrResult(texts)
      }
    })

    ocrSession.start((err) => {
      if (err) {
        console.error('OCR引擎启动失败', err)
        return
      }
      console.log('VKSession started')
      session = ocrSession
    })
  }

  async function getImageData(imagePath) {
    const imageInfo = await wx.getImageInfo({ src: imagePath })
    const canvas = wx.createOffscreenCanvas({
      type: '2d',
      width: imageInfo.width,
      height: imageInfo.height,
    })
    const context = canvas.getContext('2d')
    const img = canvas.createImage()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = imagePath
    })
    context.drawImage(img, 0, 0, imageInfo.width, imageInfo.height)
    const imgData = context.getImageData(0, 0, imageInfo.width, imageInfo.height)
    return {
      buffer: imgData.data.buffer,
      width: imageInfo.width,
      height: imageInfo.height,
    }
  }

  const runNativeOCR = async (imagePath) => {
    if (!session) {
      Toast.fail('OCR引擎未就绪')
      return
    }
    if (ocrRunning) {
      Toast('正在识别中，请稍候...')
      return
    }

    wx.showLoading({ title: '本机识别中...' })
    ocrRunning = true

    try {
      const { buffer, width, height } = await getImageData(imagePath)
      session.runOCR({
        frameBuffer: buffer,
        width,
        height,
      })
    } catch (err) {
      wx.hideLoading()
      ocrRunning = false
      console.error('runNativeOCR failed:', err)
      wx.showToast({ title: '图片处理失败', icon: 'none' })
    }
  }

  const stopVK = () => {
    if (session) {
      console.log('Stopping VKSession')
      session.stop()
      session = null
    }
  }

  onUnload(stopVK)

  return {
    initVK,
    stopVK,
    runNativeOCR,
  }
}
