# Account Worker AI 代理指南

`account-worker` 是 Leaf Account 的 Cloudflare Worker REST API 服务，用于承接从 CloudBase 云函数到 Cloudflare 的渐进式迁移。

## 技术栈

*   **Runtime**: Cloudflare Workers
*   **Framework**: Hono
*   **Language**: TypeScript
*   **Config**: `wrangler.jsonc`
*   **CLI**: Wrangler

## 开发原则

*   默认使用 RESTful API，返回统一 JSON 响应。
*   使用 ESM 和 TypeScript，不使用旧 Service Worker 写法。
*   不在代码中硬编码任何 Secret、API Key、微信 AppSecret 或 session 密钥。
*   所有敏感配置必须通过 Cloudflare Worker Secret 或环境变量注入。
*   认证、限流、错误处理、响应格式应通过中间件或共享工具统一实现。
*   业务代码可以按 `routes/`、`middleware/`、`services/`、`utils/` 拆分，避免把长期维护逻辑堆在单个文件里。

## 无登录迁移目标

当前 CloudBase 云函数依赖 `cloud.getWXContext().OPENID` 实现“用户无感但后端可识别身份”。迁移到 Cloudflare 后，应保留这种无登录体验：

```text
wx.login code
  -> Cloudflare Worker
  -> 微信 jscode2session
  -> openid
  -> Worker 签发 session token
  -> 小程序后续请求携带 Authorization: Bearer <token>
```

关键约束：

*   小程序用户不需要账号密码登录。
*   后端不得信任前端传入的 `openid`。
*   所有私有数据访问必须由服务端 session 解析出的 `openid` 决定。
*   小程序端只保存 Worker 签发的 session token，不保存微信 AppSecret 或 AI provider key。

## 推荐目录结构

目录结构应采用 Hono 常见分层：`index.ts` 负责组装应用，`routes/` 负责 HTTP 路由，`middleware/` 负责横切逻辑，`services/` 承载业务逻辑。业务域命名参考现有 `cloudfunctions/bill-cloud/service/`，方便逐步迁移和对照旧实现。

```text
account-worker/
  src/
    index.ts              # Worker 入口；创建 Hono app，挂载全局中间件和 /v1 路由
    types.ts              # Env、Variables、用户上下文、通用响应等共享类型
    routes/
      index.ts            # 汇总并挂载各业务 route
      health.ts           # 健康检查
      auth.ts             # 静默登录、session 刷新
      account.ts          # 账本相关 HTTP 路由
      bill.ts             # 账单相关 HTTP 路由
      category.ts         # 分类相关 HTTP 路由
      tag.ts              # 标签相关 HTTP 路由
      task.ts             # 导入导出任务相关 HTTP 路由
      feedback.ts         # 反馈相关 HTTP 路由
      ai.ts               # AI 图片识别等 HTTP 路由
    middleware/
      auth.ts             # session 校验，将 openid 写入 Hono context
      account.ts          # accountId 校验、账户访问权限校验
      error.ts            # BizError/未知错误统一处理
      rate-limit.ts       # 普通接口和 AI 接口限流
    services/
      account.ts          # 对应 bill-cloud/service/account.js 的业务逻辑
      bill.ts             # 对应 bill-cloud/service/bill.js 的业务逻辑
      category.ts         # 对应 bill-cloud/service/category.js 的业务逻辑
      tag.ts              # 对应 bill-cloud/service/tag.js 的业务逻辑
      task.ts             # 对应 bill-cloud/service/task.js 的业务逻辑
      feedback.ts         # 对应 bill-cloud/service/feedback.js 的业务逻辑
      auth.ts             # 微信 jscode2session、session token 签发与校验
      ai.ts               # Gemini/Workers AI 等模型调用
    utils/
      response.ts         # 统一成功/失败响应
      errors.ts           # BizError 等业务错误类型
      money.ts            # 金额解析、四舍五入等工具
      json.ts             # JSON 解析/序列化辅助
  wrangler.jsonc
  package.json
```

迁移时不要机械照搬 `bill-cloud` 的文件结构；应把旧云函数里的路由注册逻辑拆进 `routes/`，把 `middleware.js` 中的横切逻辑拆进 `middleware/`，把 `service/` 中的业务逻辑迁进 `services/`。Cloudflare 新增能力，例如 `auth`、`ai`、`rate-limit`，按 Hono 分层放到对应目录。

## API 响应约定

成功响应：

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {}
}
```

失败响应：

```json
{
  "code": 400,
  "success": false,
  "message": "错误信息"
}
```

常用 HTTP 状态码：

*   `400`: 参数错误
*   `401`: 未登录或 session 无效
*   `403`: 无权限访问
*   `404`: 资源不存在
*   `429`: 请求过多
*   `500`: 服务端错误

## Cloudflare 平台规则

开发本目录时优先参考：

*   `../.agents/cloudflare-rules/core_rules.md`
*   `../.agents/cloudflare-rules/examples_basic.md`
*   `../.agents/cloudflare-rules/examples_advanced.md`
*   `../.agents/cloudflare-rules/specialized_workers.md`
