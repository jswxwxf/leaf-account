import { defineComponent, ref, onUnload } from '@vue-mini/core'
import Toast from '@vant/weapp/toast/toast'
import { promisic } from '@/utils/index.js'
import { getAccountYears, exportAccount, importAccount } from '@/api/account.js'
import { getTask } from '@/api/task.js'

/**
 * 处理任务轮询、进度更新和文件下载的 Composable
 */
function useTaskWorker() {
  const progress = ref(0)
  const statusText = ref('')
  const isRunning = ref(false)
  let intervalId = null

  const clearTaskInterval = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const downloadAndOpenFile = async (fileID) => {
    try {
      statusText.value = '正在下载文件...'
      wx.showLoading({ title: '正在下载...', mask: true })
      const { fileList } = await wx.cloud.getTempFileURL({ fileList: [fileID] })
      if (fileList.length === 0) throw new Error('获取临时链接失败')

      const { tempFileURL } = fileList[0]
      const downloadRes = await promisic(wx.downloadFile)({
        url: tempFileURL,
      })

      if (downloadRes.statusCode !== 200) {
        throw new Error('下载文件失败')
      }

      wx.hideLoading()
      await promisic(wx.openDocument)({
        filePath: downloadRes.tempFilePath,
        showMenu: true,
      })
    } catch (error) {
      wx.hideLoading()
      console.error('下载或打开文件失败', error)
      wx.showToast({ title: '下载或打开失败', icon: 'none' })
      throw error
    } finally {
      isRunning.value = false
    }
  }

  const run = async (taskStarter) => {
    if (isRunning.value) return
    isRunning.value = true
    progress.value = 0
    statusText.value = '正在创建任务...'

    const res = await taskStarter()
    if (!res || !res.data || !res.data.taskId) {
      throw new Error('未能获取到任务ID')
    }
    const taskId = res.data.taskId

    clearTaskInterval()

    return new Promise((resolve, reject) => {
      intervalId = setInterval(async () => {
        try {
          const taskRes = await getTask(taskId)
          const task = taskRes.data
          const message = task.message
          statusText.value = message.text || ''

          if (task.status === 'processing') {
            if (progress.value < 90) progress.value += 5
          } else if (task.status === 'completed') {
            clearTaskInterval()
            progress.value = 100
            try {
              await downloadAndOpenFile(task.result.fileID)
              resolve(task)
            } catch (err) {
              reject(err)
            }
          } else if (task.status === 'failed') {
            clearTaskInterval()
            const err = new Error(message.text || '任务执行失败')
            isRunning.value = false
            reject(err)
          }
        } catch (pollError) {
          clearTaskInterval()
          statusText.value = '获取任务状态失败'
          isRunning.value = false
          console.error('轮询任务失败', pollError)
          wx.showToast({ title: pollError.message || '获取任务状态失败', icon: 'none' })
          reject(pollError)
        }
      }, 3000)
    })
  }

  onUnload(() => {
    clearTaskInterval()
  })

  return {
    progress,
    statusText,
    isRunning,
    run,
    stop: clearTaskInterval,
  }
}

defineComponent({
  // 将需要在模板中使用的数据和方法放在 setup 中返回
  setup() {
    const visible = ref(false)
    const currentAccount = ref(null)
    const mode = ref() // 'import' | 'export'
    const year = ref()
    const yearOptions = ref([])
    const fileList = ref([])

    const {
      progress: taskProgress,
      statusText: taskStatusText,
      isRunning: isTaskRunning,
      run: runTask,
      stop: stopTask,
    } = useTaskWorker()

    // Promise a+
    let _resolve, _reject

    const fetchYears = async (accountId) => {
      const res = await getAccountYears(accountId)
      yearOptions.value = res.data.map((y) => ({ text: `${y}年`, value: y }))
      year.value = res.data[0]
    }

    const onTap = async () => {
      if (mode.value === 'export') {
        await runTask(() => exportAccount(currentAccount.value._id, year.value))
      } else {
        if (fileList.value.length === 0) {
          wx.showToast({ title: '请选择文件', icon: 'none' })
          return
        }
        const file = fileList.value[0]
        await runTask(() => importAccount(currentAccount.value._id, file.url))
      }
      onClose()
    }

    const onClose = () => {
      visible.value = false
      stopTask()
      if (_reject) {
        _reject(new Error('用户取消'))
      }
    }

    // 暴露给外部实例调用的方法
    const show = async (account, options = {}) => {
      mode.value = options.mode || 'import'
      currentAccount.value = account

      await fetchYears(account._id)

      if (mode.value === 'export' && yearOptions.value.length === 0) {
        Toast('没有数据可以导出')
        return Promise.reject(new Error('没有数据可以导出'))
      }

      visible.value = true
      return new Promise((resolve, reject) => {
        _resolve = resolve
        _reject = reject
      })
    }

    // 将 setup 中定义的状态和方法返回，供模板和 methods 使用
    return {
      visible,
      mode,
      currentAccount,
      year,
      yearOptions,
      fileList,
      taskProgress,
      taskStatusText,
      isTaskRunning,
      // methods
      show,
      onTap,
      onClose,
      stopTask,
    }
  },
})
