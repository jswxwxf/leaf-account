import { defineComponent, ref } from '@vue-mini/core'
import { getAccountYears, exportAccount } from '@/api/account.js'

export default defineComponent({
  setup() {
    const visible = ref(false)
    const currentAccount = ref(null)
    const mode = ref() // 'import' | 'export'
    const year = ref()
    const yearOptions = ref([])
    const exportProgress = ref(0)
    const exportStatus = ref('')
    let watcher

    let _resolve
    let _reject

    const fetchYears = async (accountId) => {
      const res = await getAccountYears(accountId)
      yearOptions.value = res.data.map((y) => ({ text: `${y}年`, value: y }))
      year.value = res.data[0]
    }

    const show = async (account, options = {}) => {
      visible.value = true
      currentAccount.value = account
      mode.value = options.mode || 'import'
      await fetchYears(account._id)

      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    const handleExport = async () => {
      wx.showLoading({ title: '正在导出...', mask: true })

      try {
        const res = await exportAccount(currentAccount.value._id, year.value)
        const fileID = res.data.fileID

        if (!fileID) {
          throw new Error('未能获取到文件ID')
        }

        const { fileList } = await wx.cloud.getTempFileURL({ fileList: [fileID] })
        if (fileList.length > 0) {
          const { tempFileURL } = fileList[0]
          wx.downloadFile({
            url: tempFileURL,
            success: (res) => {
              if (res.statusCode === 200) {
                wx.hideLoading()
                wx.openDocument({
                  filePath: res.tempFilePath,
                  showMenu: true,
                })
              } else {
                throw new Error('下载文件失败')
              }
            },
            fail: (err) => {
              wx.hideLoading()
              throw err
            }
          })
        } else {
          throw new Error('获取临时链接失败')
        }
      } catch (error) {
        wx.hideLoading()
        console.error('导出失败', error)
        wx.showToast({ title: '导出失败，请稍后重试', icon: 'none' })
      }
    }

    const onClose = () => {
      visible.value = false
      if (watcher) {
        watcher.close()
      }
      _reject && _reject(new Error('用户取消'))
    }

    return {
      visible,
      mode,
      currentAccount,
      year,
      yearOptions,
      exportProgress,
      exportStatus,
      show,
      onClose,
      handleExport,
    }
  },
})
