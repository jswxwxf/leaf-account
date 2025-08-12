# 项目概述与技术栈

## 1. 项目简介

**小枫记账 (leaf-account)** 是一款旨在提供简洁、高效记账体验的微信小程序。用户可以通过它轻松记录日常的收入与支出，并对个人财务状况一目了然。

## 2. 核心技术栈

本项目基于一套现代化的、面向微信小程序的全栈技术方案构建而成。

### 前端

- **核心框架: `@vue-mini/core`**
  - 它允许我们使用类似 Vue.js 3 的组合式 API (`Composition API`) 来开发小程序，带来了更灵活、可维护的代码组织方式。
  - 参考文档: [vue-mini-docs](https://vuemini.org/)

- **构建工具: `weapp-vite`**
  - 一个专为微信小程序设计的、基于 Vite 的高性能构建工具。它提供了极快的冷启动速度和热更新（HMR）能力，显著提升了开发效率。
  - 参考文档: [weapp-vite-docs](https://ice-vite.netlify.app/)

- **样式方案: `Tailwind CSS` & `Vant Weapp`**
  - 通过 `weapp-tailwindcss` 插件，我们在小程序中集成了 `Tailwind CSS`，通过原子化的工具类快速构建界面。
  - 结合使用 [Vant Weapp](https://youzan.github.io/vant-weapp) 作为基础组件库，提升开发效率。
  - 参考文档: [weapp-tailwindcss-docs](https://tw.icebreaker.top/)

- **编程语言: `JavaScript`**
  - 整个项目使用 `JavaScript` 进行编写。

- **CSS 预处理器: `Less`**
  - 作为 `Tailwind CSS` 的补充，我们使用 `Less` 来处理一些无法通过工具类实现的复杂样式或定义全局样式变量。

### 后端

- **云服务**: [腾讯云开发 (CloudBase)](https://cloudbase.net/)
  - 提供数据库、云函数、存储等一体化后端服务，实现了真正的 Serverless 开发。

## 3. 目录结构

```
.
├── dist/                  # Vite 构建后的小程序代码目录
├── cloudfunctions/        # 云函数目录
├── miniprogram/           # 小程序源码目录 (Vite 中的 src)
│   ├── components/        # 可复用的组件
│   ├── pages/             # 页面
│   ├── utils/             # 工具函数
│   ├── api/               # API 请求封装
│   ├── assets/            # 静态资源 (图片等)
│   ├── app.js             # 小程序入口逻辑
│   ├── app.json           # 小程序全局配置
│   └── app.less           # 全局样式
├── .editorconfig          # 编辑器通用配置
├── .gitignore             # Git 忽略配置
├── eslint.config.js       # ESLint 配置
├── package.json           # 项目依赖
├── postcss.config.js      # PostCSS 配置
├── project.config.json    # 微信开发者工具项目配置
├── tailwind.config.js     # Tailwind CSS 配置
├── tsconfig.json          # TypeScript 配置 (用于语法提示和校验)
└── vite.config.ts         # weapp-vite 配置
