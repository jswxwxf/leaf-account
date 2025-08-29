import { defineComponent, ref, watch } from '@vue-mini/core'

defineComponent({
  properties: {
    imagePath: {
      type: String,
      default: '',
    },
    textContent: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const isPhotoFolded = ref(true)
    const isTextFolded = ref(true)

    watch(
      () => props.imagePath,
      (newVal) => {
        if (newVal) {
          isPhotoFolded.value = false
          isTextFolded.value = true
        } else {
          isPhotoFolded.value = true
          isTextFolded.value = false
        }
      },
      { immediate: true },
    )

    const toggleImageFold = () => {
      isTextFolded.value = true
      isPhotoFolded.value = !isPhotoFolded.value
    }

    const toggleTextFold = () => {
      isPhotoFolded.value = true
      isTextFolded.value = !isTextFolded.value
    }

    return {
      isPhotoFolded,
      isTextFolded,
      toggleImageFold,
      toggleTextFold,
    }
  },
})
