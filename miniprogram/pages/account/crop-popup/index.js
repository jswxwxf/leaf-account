import { defineComponent, ref, reactive } from '@vue-mini/core'

defineComponent({
  setup() {
    const visible = ref(false)
    const imagePath = ref(null)
    const imageInfo = reactive({ width: 0, height: 0 })
    const cropBox = reactive({ left: 0, top: 0, width: 0, height: 0 })
    const activeEdge = ref(null)
    const lastTouchPoint = reactive({ x: 0, y: 0 }) // 记录上一次触摸点

    let _resolve
    let _reject

    const onImageLoad = (e) => {
      const { width, height } = e.detail
      const windowInfo = wx.getWindowInfo()
      // containerWidth is window width minus padding (p-4 -> 1rem -> 16px, so 32px total)
      const containerWidth = windowInfo.windowWidth - 32
      // Approximate height, considering padding and buttons
      const containerHeight = windowInfo.windowHeight * 0.8

      const imgRatio = width / height
      const containerRatio = containerWidth / containerHeight

      let finalWidth, finalHeight
      if (imgRatio > containerRatio) {
        finalWidth = containerWidth
        finalHeight = containerWidth / imgRatio
      } else {
        finalHeight = containerHeight
        finalWidth = finalHeight * imgRatio
      }

      imageInfo.width = finalWidth
      imageInfo.height = finalHeight

      // Initialize crop box to cover the whole image
      cropBox.left = 0
      cropBox.top = 0
      cropBox.width = finalWidth
      cropBox.height = finalHeight
    }

    const onTouchStart = (e) => {
      const { edge } = e.currentTarget.dataset
      activeEdge.value = edge
      lastTouchPoint.x = e.touches[0].clientX
      lastTouchPoint.y = e.touches[0].clientY
    }

    const onTouchMove = (e) => {
      if (!activeEdge.value) return

      const { clientX, clientY } = e.touches[0]
      const deltaX = clientX - lastTouchPoint.x
      const deltaY = clientY - lastTouchPoint.y

      switch (activeEdge.value) {
        case 'top': {
          const newTop = cropBox.top + deltaY
          const newHeight = cropBox.height - deltaY
          if (newTop >= 0 && newHeight > 20) {
            cropBox.top = newTop
            cropBox.height = newHeight
          }
          break
        }
        case 'bottom': {
          const newHeight = cropBox.height + deltaY
          if (cropBox.top + newHeight <= imageInfo.height && newHeight > 20) {
            cropBox.height = newHeight
          }
          break
        }
        case 'left': {
          const newLeft = cropBox.left + deltaX
          const newWidth = cropBox.width - deltaX
          if (newLeft >= 0 && newWidth > 20) {
            cropBox.left = newLeft
            cropBox.width = newWidth
          }
          break
        }
        case 'right': {
          const newWidth = cropBox.width + deltaX
          if (cropBox.left + newWidth <= imageInfo.width && newWidth > 20) {
            cropBox.width = newWidth
          }
          break
        }
      }

      // 更新上一次触摸点
      lastTouchPoint.x = clientX
      lastTouchPoint.y = clientY
    }

    const onTouchEnd = () => {
      activeEdge.value = null
    }

    const show = (imgPath) => {
      imagePath.value = imgPath
      visible.value = true
      // Reset state on show
      activeEdge.value = null
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const onClose = () => {
      imagePath.value = null
      visible.value = false
      if (_reject) {
        _reject(new Error('用户取消'))
      }
    }

    const onConfirm = () => {
      const dpr = wx.getWindowInfo().pixelRatio
      const offscreenCanvas = wx.createOffscreenCanvas({ type: '2d', width: cropBox.width * dpr, height: cropBox.height * dpr })
      const ctx = offscreenCanvas.getContext('2d')
      ctx.scale(dpr, dpr)

      const img = offscreenCanvas.createImage()
      img.onload = () => {
        // 计算裁剪区域在原始图片上的对应坐标
        const scale = img.width / imageInfo.width
        const sx = cropBox.left * scale
        const sy = cropBox.top * scale
        const sWidth = cropBox.width * scale
        const sHeight = cropBox.height * scale

        // 将原始图片的裁剪区域，绘制到与裁剪框等大的离屏画布上
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cropBox.width, cropBox.height)

        // 将离屏Canvas转为临时文件路径
        const dataURL = offscreenCanvas.toDataURL()
        const fs = wx.getFileSystemManager()
        const tempFilePath = `${wx.env.USER_DATA_PATH}/crop_${Date.now()}.png`

        fs.writeFile({
          filePath: tempFilePath,
          data: dataURL.split(',')[1],
          encoding: 'base64',
          success: () => {
            if (_resolve) {
              _resolve(tempFilePath)
            }
            onClose()
          },
          fail: (err) => {
            console.error('Failed to write temp file', err)
            if(_reject) _reject(err)
          }
        })
      }
      img.src = imagePath.value
    }

    return {
      visible,
      imagePath,
      imageInfo,
      cropBox,
      activeEdge,
      show,
      onClose,
      onConfirm,
      onImageLoad,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    }
  },
})
