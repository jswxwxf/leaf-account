import Toast from '@vant/weapp/toast/toast.js'

function getAiPrompt() {
  return `
你是一个专业的记账助手。你的任务是从用户提供的原始文本中，尽最大努力扫描并提取所有可能的账单条目，并将其转换为一个严格的JSON数组。

【约束条件】
1.  你必须严格按照指定的JSON格式返回数据，不要添加任何额外的解释、注释或非JSON内容。
2.  **从整个文本中扫描并提取所有可能的账单条目。** 即使某个条目只包含金额或只包含描述，也要提取出来。
3.  \`datetime\` 字段应为从文本中识别出的**日期或时间字符串**。请优先使用以下正则表达式进行匹配：\`\\d{4}年\\d{1,2}月\\d{1,2}日\`, \`\\d{1,2}月\\d{1,2}日\`, \`\\d{2}:\\d{2}\`。
4.  \`category\` 字段暂时固定为 \`null\`。
5.  \`amount\` 字段请优先使用此正则表达式 \`[+-]?\\\\d+\\\\.\\\\d{2}\` 匹配金额。金额可以带有正负号。
6.  \`note\` 字段暂应为从文本中识别出的**所有可能的描述**。
7.  如果原始文本为空或无法提取出任何有效账单，你必须返回一个空数组 \`[]\`。

【输出JSON格式】
[
  {
    "datetime": string,
    "category": null,
    "amount": number,
    "note": string,
  }
]

【原始文本】
{raw_text}
`
}

export function useAi() {
  const analyzeBillsFromText = async (rawText) => {
    const prompt = getAiPrompt().replace('{raw_text}', rawText)
    console.log('AI分析请求:', prompt)

    wx.showLoading({ title: 'AI分析中...' })

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
      console.log('AI分析结果:', reply)
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
  }
}
