import { ref } from '@vue-mini/core'

export const tagsSelector = ref(null)

export function showTagsSelector(tags, options) {
  if (!tagsSelector.value) {
    return Promise.reject(new Error('Tags selector not initialized'))
  }
  return tagsSelector.value.show(tags, options)
}

export const categorySelector = ref(null)

export function showCategorySelector(value, options) {
  if (!categorySelector.value) {
    return Promise.reject(new Error('Category selector not initialized'))
  }
  return categorySelector.value.show(value, options)
}

export const calendarSelector = ref(null)

export function showCalendar(currentDate) {
  if (!calendarSelector.value) {
    return Promise.reject(new Error('Calendar selector not initialized'))
  }
  return calendarSelector.value.show(currentDate)
}

export const accountSelector = ref(null)

export function showAccountSelector(options) {
  if (!accountSelector.value) {
    return Promise.reject(new Error('Account selector not initialized'))
  }
  return accountSelector.value.show(options)
}

export const editorPopup = ref(null)

export function showEditorPopup(text, options) {
  if (!editorPopup.value) {
    return Promise.reject(new Error('Editor popup not initialized'))
  }
  return editorPopup.value.show(text, options)
}

export const transferPopup = ref(null)

export function showTransferPopup(options) {
  if (!transferPopup.value) {
    return Promise.reject(new Error('Transfer popup not initialized'))
  }
  return transferPopup.value.show(options)
}

export const imexportPopup = ref(null)

export function showImexportPopup(account, options) {
  if (!imexportPopup.value) {
    return Promise.reject(new Error('Imexport popup not initialized'))
  }
  return imexportPopup.value.show(account, options)
}

export const monthSelector = ref(null)

export function showMonthSelector(value, options) {
  if (!monthSelector.value) {
    return Promise.reject(new Error('Month selector not initialized'))
  }
  return monthSelector.value.show(value, options)
}
