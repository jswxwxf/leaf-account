import { ref } from '@vue-mini/core'

export const tagsPopup = ref(null)

export function showTagsPopup(tags) {
  if (!tagsPopup.value) {
    return Promise.reject(new Error('Tags popup not initialized'))
  }
  return tagsPopup.value.show(tags)
}

export const categoryPopup = ref(null)

export function showCategoryPopup() {
  if (!categoryPopup.value) {
    return Promise.reject(new Error('Category popup not initialized'))
  }
  return categoryPopup.value.show()
}

export const theToast = ref(null)

export function showToast(message) {
  if (!theToast.value) {
    return Promise.reject(new Error('Toast not initialized'))
  }
  return theToast.value.showToast(message)
}
