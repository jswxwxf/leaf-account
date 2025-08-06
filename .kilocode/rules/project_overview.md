# 项目概述与技术栈

## 1. 项目简介

**小叶记账 (leaf-account)** 是一款旨在提供简洁、高效记账体验的微信小程序。用户可以通过它轻松记录日常的收入与支出，并对个人财务状况一目了然。

## 2. 核心技术栈

本项目基于一套现代化的、面向微信小程序的前端技术栈构建而成。

- **核心框架: `@vue-mini/core`**
  - 它允许我们使用类似 Vue.js 3 的组合式 API (`Composition API`) 来开发小程序，带来了更灵活、可维护的代码组织方式。
  - 参考文档: [vue-mini-docs](https://vuemini.org/)

- **样式方案: `Tailwind CSS`**
  - 通过 `weapp-tailwindcss` 插件，我们在小程序中集成了 `Tailwind CSS`。这使得我们可以通过原子化的工具类快速构建界面，而无需编写大量的自定义 CSS。
  - 参考文档: [weapp-tailwindcss-docs](https://tw.icebreaker.top/)

- **构建工具: `weapp-vite`**
  - 一个专为微信小程序设计的、基于 Vite 的高性能构建工具。它提供了极快的冷启动速度和热更新（HMR）能力，显著提升了开发效率。
  - 参考文档: [weapp-vite-docs](https://ice-vite.netlify.app/)

- **编程语言: `TypeScript`**
  - 整个项目使用 `TypeScript` 进行编写，为代码提供了强大的类型支持，有助于在编译阶段发现潜在错误，提高代码的健壮性。

- **CSS 预处理器: `Less`**
  - 作为 `Tailwind CSS` 的补充，我们使用 `Less` 来处理一些无法通过工具类实现的复杂样式或定义全局样式变量。

## 3. 目录结构

```
.
├── dist/                  # Vite 构建后的小程序代码目录
├── src/
│   ├── components/        # 可复用的组件
│   ├── images/            # 图片资源
│   ├── pages/             # 页面
│   │   ├── home/
│   │   └── mine/
│   ├── utils/             # 工具函数
│   ├── app.ts             # 小程序入口逻辑
│   ├── app.json           # 小程序全局配置
│   └── app.less           # 全局样式
├── .editorconfig          # 编辑器通用配置
├── .gitignore             # Git 忽略配置
├── eslint.config.js       # ESLint 配置
├── package.json           # 项目依赖
├── postcss.config.js      # PostCSS 配置
├── project.config.json    # 微信开发者工具项目配置
├── tailwind.config.js     # Tailwind CSS 配置
├── tsconfig.json          # TypeScript 配置
└── vite.config.ts         # weapp-vite 配置
```
