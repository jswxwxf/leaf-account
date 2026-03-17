# 小枫记账 (leaf-account)

[![Powered by CloudBase](https://img.shields.io/badge/Powered%20by-CloudBase-blue)](https://cloudbase.net/)

一款基于 `weapp-vite` + `@vue-mini/core` + `Tailwind CSS` 构建的微信小程序记账应用，后端服务由**腾讯云开发 (CloudBase)** 提供支持。

## 简介

**小枫记账** 是一款旨在提供简洁、高效记账体验的微信小程序。用户可以通过它轻松记录日常的收入与支出，并通过图表功能对个人财务状况一目了然。

## 核心功能 (MVP)

- **日常记账**: 快速记录每一笔收入和支出。
- **账单分类**: 支持自定义消费分类，方便统计。
- **标签系统**: 为账单添加多个标签，实现多维度管理。
- **云端同步**: 所有数据安全地存储在云开发数据库中，实现多设备同步。

## 软件截图

| 帐本 | 账目 | 账目操作 |
| :---: | :---: | :---: |
| <img src="./screens/10-%E5%B8%90%E6%9C%AC.jpg" width="200" /> | <img src="./screens/20-%E8%B4%A6%E7%9B%AE.jpg" width="200" /> | <img src="./screens/21-%E8%B4%A6%E7%9B%AE%E6%93%8D%E4%BD%9C.jpg" width="200" /> |

| 账目编辑 | 账目菜单 | 账目记账 |
| :---: | :---: | :---: |
| <img src="./screens/22-%E8%B4%A6%E7%9B%AE%E7%BC%96%E8%BE%91.jpg" width="200" /> | <img src="./screens/23-%E8%B4%A6%E7%9B%AE%E8%8F%9C%E5%8D%95.jpg" width="200" /> | <img src="./screens/24-%E8%B4%A6%E7%9B%AE%E8%AE%B0%E8%B4%A6.jpg" width="200" /> |

| 账目图表 | 账目日历 | AI记账 |
| :---: | :---: | :---: |
| <img src="./screens/25-%E8%B4%A6%E7%9B%AE%E5%9B%BE%E8%A1%A8.jpg" width="200" /> | <img src="./screens/26-%E8%B4%A6%E7%9B%AE%E6%97%A5%E5%8E%86.jpg" width="200" /> | <img src="./screens/30-AI%20%E8%AE%B0%E8%B4%A6.jpg" width="200" /> |

| AI记账解析 | AI记账结果 | 统计 |
| :---: | :---: | :---: |
| <img src="./screens/31-AI%20%E8%AE%B0%E8%B4%A6%E8%A7%A3%E6%9E%90.jpg" width="200" /> | <img src="./screens/32-AI%20%E8%AE%B0%E8%B4%A6%E7%BB%93%E6%9E%9C.jpg" width="200" /> | <img src="./screens/40-%E7%BB%9F%E8%AE%A1.jpg" width="200" /> |

## 技术栈

- **前端**:
  - **核心框架**: [`@vue-mini/core`](https://vuemini.org/)
  - **构建工具**: [`weapp-vite`](https://ice-vite.netlify.app/)
  - **样式方案**: [`Tailwind CSS`](https://tailwindcss.com/) (通过 `weapp-tailwindcss` 集成)
  - **UI 组件库**: [`Vant Weapp`](https://youzan.github.io/vant-weapp)
  - **编程语言**: `JavaScript`

- **后端**:
  - **云服务**: [腾讯云开发 (CloudBase)](https://cloudbase.net/)
  - **数据库**: 云开发数据库 (NoSQL)
  - **云函数**: 用于处理复杂的后端逻辑，如数据导入、统计等。

## 快速上手

1.  **克隆项目**
    ```bash
    git clone https://github.com/your-repo/leaf-account.git
    cd leaf-account
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置云开发环境**
    - 登录[腾讯云开发控制台](https://console.cloud.tencent.com/tcb)，创建一个新的云开发环境。
    - 创建 miniprogram/envList.js 并将获取到的**环境 ID** 填入。如下所示：
    ```javascript
      const envList =     [{"envId":"xxxxx-xxxxxx","alias":"xxxxx"}];
      const isMac = true;
      module.exports = {
        envList,
        isMac
      };
    ```

4.  **导入数据库和云函数**
    - **数据库**: 在云开发控制台，创建 `bill`、`category`、`tag` 等数据库集合。
    - **云函数**: 在项目根目录的 `cloudfunctions\bill-cloud` 文件夹上右键，选择“上传并部署：所有云函数”。

5.  **启动开发服务器**
    ```bash
    npm run dev
    ```

6.  **在微信开发者工具中打开**
    - 打开微信开发者工具，导入项目根目录。
    - 刷新项目，开始开发。

## 项目结构

```
.
├── dist/                  # Vite 构建后的小程序代码目录
├── cloudfunctions/        # 云函数目录
├── miniprogram/
│   ├── components/        # 可复用的组件
│   ├── pages/             # 页面
│   ├── utils/             # 工具函数
│   ├── api/               # API 请求封装
│   ├── app.js             # 小程序入口逻辑
│   ├── app.json           # 小程序全局配置
│   └── app.less           # 全局样式
├── .kilocode/             # AI 开发规则目录
├── package.json           # 项目依赖
├── project.config.json    # 微信开发者工具项目配置
├── tailwind.config.js     # Tailwind CSS 配置
└── vite.config.mts         # weapp-vite 配置
```

