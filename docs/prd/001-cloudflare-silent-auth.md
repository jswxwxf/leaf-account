# PRD 001: Cloudflare 无登录认证基础设施

## 1. 背景

Leaf Account 当前使用微信云开发 CloudBase 云函数作为后端。现有体验是“无登录”：用户不需要输入账号密码，也不需要点击授权登录，但云函数可以通过 `cloud.getWXContext().OPENID` 自动识别当前微信用户，并用 `_openid` 隔离账本、账单、分类、标签等私有数据。

后续计划逐步将微信后端从腾讯云迁移到 Cloudflare。迁移后 Cloudflare Worker 不再天然拥有 `OPENID` 上下文，因此需要搭建一套等价的静默身份认证基础设施，在保持用户无感体验的同时，为所有 REST API 提供稳定、安全的用户身份。

## 2. 目标

1. 保留当前“无登录”用户体验。
2. 在 Cloudflare Worker 中建立等价于 CloudBase `OPENID` 的用户上下文。
3. 为后续账本、账单、分类、AI、导入导出等 REST API 提供统一认证中间件。
4. 避免在微信小程序前端暴露任何服务端密钥，例如微信 `AppSecret`、Gemini API Key、TokenHub API Key。
5. 支持后续按用户维度限流、审计、数据隔离和服务迁移。

## 3. 非目标

1. 不实现账号密码登录。
2. 不实现手机号登录、微信手机号授权或第三方 OAuth 登录。
3. 不在本阶段迁移账单、账户、分类、标签等完整业务 API。
4. 不在本阶段实现完整 D1 数据模型迁移。
5. 不在小程序前端保存任何长期服务端密钥。

## 4. 当前行为

当前 `bill-cloud` 中间件依赖微信云函数上下文：

- `requireLogin` 通过 `cloud.getWXContext().OPENID` 判断用户是否存在。
- 业务服务通过 `OPENID` 查询和写入私有数据。
- 公共模板数据通过 `_openid` 为空进行识别。
- 前端调用云函数时无需显式传登录态。

迁移到 Cloudflare 后，需要将隐式 `OPENID` 改为显式但无感的静默会话：

```text
wx.login code
  -> Cloudflare Worker
  -> 微信 jscode2session
  -> openid
  -> Worker 签发 session token
  -> 后续 API 请求携带 Authorization: Bearer <token>
```

## 5. 用户故事

### 5.1 首次打开小程序

作为用户，我打开小程序后不需要注册或登录，应用可以自动完成身份初始化，并正常加载我的账本数据。

### 5.2 后续打开小程序

作为用户，我再次打开小程序时，如果本地 session 仍有效，应用无需重新请求身份；如果 session 过期，应用自动静默刷新。

### 5.3 请求业务接口

作为用户，我进行账单读取、保存、删除、AI 识别等操作时，后端必须知道请求属于哪个微信用户，并只能访问该用户自己的数据。

### 5.4 非法调用

作为系统维护者，我希望即使有人知道 Worker API 地址，也无法绕过微信身份校验访问服务或消耗 AI 额度。

## 6. 功能需求

### 6.1 静默登录接口

新增 REST API：

```http
POST /v1/auth/wechat/session
```

请求体：

```json
{
  "code": "wx.login 返回的临时 code"
}
```

处理流程：

1. 校验 `code` 是否存在。
2. Worker 使用环境变量中的 `WECHAT_APPID` 和 `WECHAT_SECRET` 请求微信 `jscode2session`。
3. 从微信响应中获取 `openid`。
4. 如用户不存在，则创建用户记录或延迟到首个业务写入时创建。
5. 签发应用自己的 session token。
6. 返回 token、过期时间和基础用户信息。

响应示例：

```json
{
  "code": 200,
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "session-token",
    "expiresAt": 1790000000000,
    "user": {
      "openid": "masked-openid"
    }
  }
}
```

### 6.2 会话校验中间件

所有需要用户身份的业务 API 默认接入认证中间件。

请求头：

```http
Authorization: Bearer <session-token>
```

中间件职责：

1. 解析 `Authorization`。
2. 校验 token 签名或查询 session 存储。
3. 检查 token 是否过期、撤销或异常。
4. 将用户上下文写入请求上下文，例如 `c.set('user', { openid })`。
5. 认证失败时返回统一 `401`。

错误响应：

```json
{
  "code": 401,
  "success": false,
  "message": "未登录或登录已过期"
}
```

### 6.3 Session 设计

支持两种实现方式，第一版推荐使用方案 A。

方案 A：签名 token

- 使用 HMAC 签名。
- 环境变量保存 `SESSION_SECRET`。
- token 中包含 `openid`、`iat`、`exp`。
- Worker 无需查库即可验证。
- 适合早期快速落地。

方案 B：不透明 session id

- token 仅为随机 session id。
- session 数据存储在 D1 或 KV。
- 支持强制登出、撤销、设备管理。
- 适合后期增强。

第一版要求：

- token 默认有效期：30 天。
- 小程序本地缓存 token 和过期时间。
- 过期前可重新调用 `/v1/auth/wechat/session` 静默刷新。

### 6.4 小程序端集成

小程序需要新增统一 API 请求层能力：

1. 启动时检查本地 token。
2. token 不存在或过期时调用 `wx.login()`。
3. 使用 `code` 请求 `/v1/auth/wechat/session`。
4. 保存返回 token。
5. 所有 Cloudflare API 请求自动附加：

```http
Authorization: Bearer <token>
```

当业务接口返回 `401` 时：

1. 清除本地 token。
2. 重新执行静默登录。
3. 可重试原请求一次。

### 6.5 用户身份与数据隔离

Cloudflare 后端业务数据必须使用 `openid` 作为用户隔离字段。

迁移后的私有表建议统一使用：

```sql
openid TEXT NOT NULL
```

所有查询和写入必须由服务端从 session 中读取 `openid`，不得信任前端传入的 `openid`。

公共模板数据可以采用：

```sql
owner_type TEXT NOT NULL DEFAULT 'user'
openid TEXT
```

或：

```sql
openid IS NULL
```

用于对应当前 CloudBase 中 `_openid` 为空的内置分类、模板账本等数据。

### 6.6 限流与防滥用

第一版至少实现接口级基础限流策略：

- 按 openid 限制认证后请求频率。
- 按 IP 限制未认证请求频率。
- AI 接口单独设置更严格限流。

建议默认值：

- `/v1/auth/wechat/session`：每 IP 每分钟 20 次。
- 普通业务 API：每 openid 每分钟 120 次。
- AI 图片识别 API：每 openid 每分钟 5 次，每日 100 次。

限流存储可按阶段选择：

- 第一版：Cloudflare Rate Limiting Rules 或 KV。
- 后续：Durable Object 或 D1 记录每日用量。

### 6.7 安全要求

1. `WECHAT_SECRET` 只能存放在 Cloudflare Worker Secret 中。
2. `SESSION_SECRET` 只能存放在 Cloudflare Worker Secret 中。
3. AI provider API Key 只能存放在 Cloudflare Worker Secret 中。
4. 小程序前端不得保存任何服务端密钥。
5. Worker API 必须使用 HTTPS。
6. 小程序后台必须将 Worker 域名加入 `request 合法域名`。
7. 所有错误响应不得泄露微信 AppSecret、AI Key、完整 token、数据库 SQL 等敏感信息。

## 7. REST API 约定

统一成功响应：

```json
{
  "code": 200,
  "success": true,
  "message": "ok",
  "data": {}
}
```

统一失败响应：

```json
{
  "code": 400,
  "success": false,
  "message": "错误信息"
}
```

建议状态码：

- `200`：成功。
- `400`：参数错误。
- `401`：未登录或 session 无效。
- `403`：无权限访问资源。
- `404`：资源不存在。
- `429`：请求过多。
- `500`：服务端错误。

## 8. Worker 项目结构建议

```text
account-worker/
  src/
    index.ts
    routes/
      auth.ts
      ai.ts
      health.ts
    middleware/
      auth.ts
      error.ts
      rate-limit.ts
    services/
      wechat.ts
      session.ts
      gemini.ts
    utils/
      response.ts
      crypto.ts
```

当前阶段优先实现：

1. `routes/auth.ts`
2. `services/wechat.ts`
3. `services/session.ts`
4. `middleware/auth.ts`
5. `utils/response.ts`

## 9. 环境变量与 Secret

必需：

```text
WECHAT_APPID
WECHAT_SECRET
SESSION_SECRET
```

后续 AI 接入需要：

```text
GEMINI_API_KEY
```

本地开发可使用 `.dev.vars`，生产环境必须使用 Wrangler Secret。

## 10. 验收标准

1. 小程序无需展示登录页面即可获取 Cloudflare session。
2. 无 token 请求受保护接口时返回 `401`。
3. 有效 token 请求受保护接口时，Worker 可得到当前用户 `openid`。
4. 过期 token 请求受保护接口时返回 `401`。
5. 小程序收到 `401` 后可以静默重新登录。
6. 服务端不会信任前端传入的 `openid`。
7. 微信 `AppSecret`、`SESSION_SECRET`、AI Key 不出现在小程序代码中。
8. AI 接口可以按 openid 维度限流。

## 11. 迁移顺序建议

1. 建立 Cloudflare Worker REST API 骨架。
2. 实现静默认证接口 `/v1/auth/wechat/session`。
3. 实现认证中间件，并加一个测试用受保护接口。
4. 小程序新增 Cloudflare API 请求封装。
5. 接入 AI 图片识别接口，验证无登录认证链路。
6. 再逐步迁移账本、账单、分类、标签等业务 API。

## 12. 待确认问题

1. Session token 使用 HMAC JWT-like 格式，还是使用 D1/KV 存储的不透明 session id？
2. 第一阶段是否限制只有指定 openid 白名单可访问 Cloudflare API？
3. AI 图片识别每日额度是否需要用户级用量统计？
4. 公共模板数据迁移时使用 `openid IS NULL`，还是显式 `owner_type = 'system'`？
5. 是否需要多设备 session 管理和远程撤销能力？
