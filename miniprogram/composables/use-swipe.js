import { ref } from '@vue-mini/core'

export function useSwipe({ onSwipeLeft, onSwipeRight }) {
  const touchStartX = ref(0)

  const handleTouchStart = (e) => {
    touchStartX.value = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX
    const deltaX = touchEndX - touchStartX.value

    // 如果滑动距离太短，则不作处理
    if (Math.abs(deltaX) < 50) {
      return
    }

    if (deltaX > 0) {
      // 右滑
      if (onSwipeRight) {
        onSwipeRight()
      }
    } else {
      // 左滑
      if (onSwipeLeft) {
        onSwipeLeft()
      }
    }
  }

  return {
    handleTouchStart,
    handleTouchEnd,
  }
}
