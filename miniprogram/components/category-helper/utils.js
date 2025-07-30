import { ref } from "@vue-mini/core"

export const categoryPopup = ref(null)

export function showCategoryPopup() {
  if (!categoryPopup.value) {
    return Promise.reject(new Error('Category popup not initialized'))
  }
  return categoryPopup.value.show()
}
