# 小枫记账微信小程序项目深度调研报告

## 1. 项目概览

“小枫记账”是一个原生的微信小程序记账应用，其核心技术栈基于微信云开发（CloudBase）。它前后端分离结构清晰，整体使用单体云函数架构配合原生语法扩展框架的方式，以此确保高效的开发体验和稳定的性能：
- **前端 (`miniprogram`)**: 采用 `@vue-mini/core` 框架。这是一个将 Vue 3 Composition API（如 `ref`, `computed`, `watch`, `provide`, `inject`）特性引入原生小程序体系的轻量级库。模板层依然保留微信原生的 WXML 与 WXSS（采用 Less 预处理）。
- **后端 (`cloudfunctions/bill-cloud`)**: 使用微信云函数环境中的 `wx-server-sdk` 和 `tcb-router`。它采用单体云函数架构，将大量 API 集中派发到一个主函数中，以此打破微信小程序云函数数量限制，提供稳健且支持事务（Transaction）的记账接口层。

---

## 2. 前端架构与实现细节 (`miniprogram` 目录)

### 2.1 全局配置与入口
*   **`app.js`**: 应用入口，全局使用 `createApp` 初始化。`globalData` 采用了 Vue 的响应式对象如 `ref({name: 'leaf-maple'})`，实现当前记账本上下文、底部 Tab 状态的全局响应式流转；内部同时通过 `wx.cloud.init()` 初始化了云环境。
*   **`app.json`**: 定义了底部的四大多功能核心 Tab：
    1.  `pages/account/index`（流水账）：显示基于时间线归纳的账单。
    2.  `pages/cabinet/index`（账本）：多账本管理界面。
    3.  `pages/stats/index`（统计）：图表和账单概览。
    4.  `pages/setting/index`（设置）：用户常规设置和反馈。

### 2.2 核心状态管理与页面逻辑
*以 `account/index` 为例：*
*   业务状态抽离到了 `store.js` 进行局部共享。包括使用 `loadAccount` 和 `fetchBills` 直接请求后台，根据 `datetime` 字段由业务聚合出 `dailyBills` 实现以“天”为维度的列表渲染。
*   利用 Vue 3 特性的 `watch([monthValue, queryData], scrollToTop)` 实现根据过滤条件动态刷新和定位列表。
*   页面采用了极其细致的基于组件化的抽屉/弹窗视图交互，如通过独立暴露的 `show()` 方法挂载如 `bill-popup`（账单表单）、`batch-popup`（批量操作表单）、`update-popup`（批量编辑）、`chart-popup`（图表弹窗）等，使得界面极为整洁且降低页面路由跳转损耗。

### 2.3 智能化扩展（AI & OCR）
小枫记账内含有极其先进的 AI 解析模块，其逻辑收口在 `composables/use-ai.js` 和 `composables/use-ocr.js` 中：
*   **混元大模型解析 (`use-ai.js`)**: 借助微信最新的 `wx.cloud.extend.AI.createModel('hunyuan-exp')` 智能调用。前端预置了精密的 Prompt，强制模型以严格的 `JSON Array` 格式输出账单的时间、金额、和备注。
    *   纯文字解析：使用 `hunyuan-lite` 解析纯文本意图。
    *   图像解析：使用 `hunyuan-vision` 进行多模态大模型视觉理解，从图片直接提取各类混合账单。
*   **原生 OCR 备用服务 (`use-ocr.js`)**: 调用了名为 `wx79ac3de8be320b71` 的服务市场智能识别 OCR，对图像字符做强制拉取后再做降噪处理。

### 2.4 请求拦截与去重 (`api/request.js`)
*   针对云函数的调用使用自定义的 `request-cloud.js` 统一封装处理。所有由 `tcb-router` 包装的业务级错误结构体会被规范转为 Promise 的 reject。
*   利用 `dedupRequest` 支持同参数的请求拦截和自动去重，防止弱网下用户的误触多发。

---

## 3. 后端架构与实现细节 (`cloudfunctions/bill-cloud` 目录)

### 3.1 路由规划 (`index.js`)
主文件实例化 `TcbRouter`，对外暴露单一的函数执行环境，内联声明了大量针对记账的 API 并导流到了具体的 Service：
*   **路由命名**: `/upsert/bill`, `/post/transfer`, `/get/bills`, `/batch/bills`, 等。
*   **中间件设计 (`middleware.js`)**: 经过全局中间件（处理 `event` 和 `models` 校验与上下文绑定），在进入各类路由处理前保证状态闭环。

### 3.2 强一致性的数据库操作 (`service/bill.js` 等)
微信小程序的云数据库底层类似于 MongoDB，但涉及资金数据时，该项目采用了严谨的**云数据库事务机制（`db.startTransaction()`）**，保证数据的强一致性：
*   **账单与余额同步计算**: 无论是新建、编辑、还是删除一条账单数据（`_saveBill`），系统不仅会变更 `bill` 集合，内部代码还会精准计算当前旧金额和新金额导致的增减量（`incomeIncrement`/`expenseIncrement`/`balanceIncrement`），而后调用 `_updateAccount` 对当前关联对象的 `account` 表执行原子级的总计覆盖。若中途崩溃，两边的数据均自动 rollback 回退，保障账户余额永远对应真实的流水统计。
*   **聚合查询引擎 (`$.aggregate`)**: 以 `getBillsSummary` 为代表，针对指定月份或类型的复杂过滤利用云开发的 `aggregate` 流水线操作做到条件过滤（`match`）、多表联查挂载分类与标签（`lookup`）和计算求和（`sum`），避免前端遍历计算并减小响应负载。

### 3.3 并发与分页请求处理
*   **智能回溯分页 (`getBills`)**: 项目不是无脑地根据偏移量 `skip` 查询数据，由于流水按照时间分布会极度不均，采用了游标加“时间视窗滑移”策略（`periodStartDate`）。通过 `FETCH_WINDOW_DAYS` 等限制，逐次逼近最早有数据的界限，减少单次加载过多记录撑爆内存的危险，同时通过 `$lookup` 对每条记录自动映射组装好分类（categoryInfo）与标签（tagsInfo）集合返回响应。

---

## 4. 总结

“小枫记账”不仅完美适配了微信原生体系的功能局限，还展现出了现代工程架构的前卫性。前端不仅保留原生小程序的顺滑渲染，且彻底享受到了 `Vue 3` 的生态与工程效益；后端用单体 `TcbRouter` 将云函数当做 Node 守护进程微服务来管理，同时在关键的金融性读写场景内应用原生云端事物强约束。加之先进的多模态模型接入，整体上构建了一个拥有出众用户体验和扩展灵活性的优秀系统方案。
