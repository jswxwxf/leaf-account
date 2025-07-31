import { ref } from "@vue-mini/core"

export const tagsPopup = ref(null)

export function showTagsPopup() {
  if (!tagsPopup.value) {
    return Promise.reject(new Error('Tags popup not initialized'))
  }
  return tagsPopup.value.show()
}
