import Toast from '@vant/weapp/toast/toast.js'

function getAiPrompt(type = 'text') {
  if (type === 'image') {
    return `
你是一个专业的记账助手。你的任务是从用户提供的图片中，尽最大努力扫描并提取所有可能的账单条目，并将其转换为一个严格的JSON数组。

【约束条件】
1.  你必须严格按照指定的JSON格式返回数据，不要添加任何额外的解释、注释或非JSON内容。
2.  **从整个图片中扫描并提取所有可能的账单条目。** 即使某个条目只包含金额或只包含描述，也要提取出来。
3.  \`datetime\` 字段应为从图片中识别出的**日期或时间字符串**。请优先使用以下正则表达式进行匹配：\`\\d{4}年\\d{1,2}月\\d{1,2}日\`, \`\\d{1,2}月\\d{1,2}日\`, \`\\d{2}:\\d{2}\`。
4.  \`category\` 字段暂时固定为 \`null\`。
5.  \`amount\` 字段请优先使用此正则表达式 \`[+-]?\\\\d+\\\\.\\\\d{2}\` 匹配金额。金额可以带有正负号。
6.  \`note\` 字段应为从图片中识别出的**描述**，且长度不应超过15个字符。
7.  如果图片为空或无法提取出任何有效账单，你必须返回一个空数组 \`[]\`。

【输出JSON格式】
[
  {
    "datetime": string,
    "category": null,
    "amount": number,
    "note": string,
    "tags": string[]
  }
]
`
  }

  return `
你是一个专业的记账助手。你的任务是从用户提供的原始文本中，尽最大努力扫描并提取所有可能的账单条目，并将其转换为一个严格的JSON数组。

【约束条件】
1.  你必须严格按照指定的JSON格式返回数据，不要添加任何额外的解释、注释或非JSON内容。
2.  **从整个文本中扫描并提取所有可能的账单条目。** 即使某个条目只包含金额或只包含描述，也要提取出来。
3.  \`datetime\` 字段应为从文本中识别出的**日期或时间字符串**。请优先使用以下正则表达式进行匹配：\`\\d{4}年\\d{1,2}月\\d{1,2}日\`, \`\\d{1,2}月\\d{1,2}日\`, \`\\d{2}:\\d{2}\`。
4.  \`category\` 字段暂时固定为 \`null\`。
5.  \`amount\` 字段请优先使用此正则表达式 \`[+-]?\\\\d+\\\\.\\\\d{2}\` 匹配金额。金额可以带有正负号。
6.  \`note\` 字段应为从文本中识别出的**描述**，且长度不应超过15个字符。
7.  如果原始文本为空或无法提取出任何有效账单，你必须返回一个空数组 \`[]\`。

【输出JSON格式】
[
  {
    "datetime": string,
    "category": null,
    "amount": number,
    "note": string,
    "tags": string[]
  }
]

【原始文本】
{raw_text}
`
}

export function useAi() {
  const analyzeBillsFromText = async (rawText) => {
    const prompt = getAiPrompt('text').replace('{raw_text}', rawText)

    wx.showLoading({ title: 'AI 解析中...' })

    try {
      const model = wx.cloud.extend.AI.createModel('hunyuan-exp')
      const res = await model.generateText({
        model: 'hunyuan-lite',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
      wx.hideLoading()
      const reply = res.choices[0].message.content
      // console.log(reply)
      return JSON.parse(reply)
    } catch (err) {
      wx.hideLoading()
      console.error('AI分析失败:', err)
      Toast.fail('AI分析失败，请稍后重试')
      return Promise.reject(err)
    }
  }

  const analyzeBillsFromImage = async (image) => {
    const prompt = getAiPrompt('image')

    wx.showLoading({ title: 'AI 解析中...' })

    try {
      // 使用支持多模态的模型
      const model = wx.cloud.extend.AI.createModel('hunyuan-exp')
      const res = await model.generateText({
        model: 'hunyuan-vision', // 指定为多模态大模型
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: image, // image 现在是 dataURL
                },
              },
            ],
          },
        ],
      })
      wx.hideLoading()
      const reply = res.choices[0].message.content
      // console.log(reply)
      return JSON.parse(reply)
    } catch (err) {
      wx.hideLoading()
      console.error('AI分析失败:', err)
      Toast.fail('AI分析失败，请稍后重试')
      return Promise.reject(err)
    }
  }

  return {
    analyzeBillsFromText,
    analyzeBillsFromImage,
  }
}
