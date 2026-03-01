# 项目核心技术栈与开发规范

## 1. 核心技术栈

- **框架**: `@vue-mini/core` (使用类似 Vue 3 的组合式 API)
- **样式**: `Tailwind CSS` (优先使用原子化 CSS)
- **UI 组件库**: `Vant Weapp` (按需使用，与 Tailwind 结合)
- **语言**: `JavaScript`
- **构建工具**: `weapp-vite`

## 2. 开发原则

- **样式优先**: 总是优先使用 `Tailwind CSS` 的工具类。只有在无法实现或样式非常复杂时，才考虑使用 WXSS 或 Less。
- **组件优先**: 优先使用 `Vant Weapp` 提供的现有组件，而不是自己从头构建。
- **逻辑优先**: 使用 `@vue-mini/core` 的组合式 API (`setup`, `ref`, `reactive`, `computed` 等) 来组织页面和组件的逻辑。
- **代码规范**: 严格遵守 `coding_standards.md` 中定义的命名、格式和代码组织规范。
- **路径别名**: 当模块引用层级超过两层 (`../../`) 时，强制使用 `@` 别名。

## 3. 工作流程

1.  **分析需求**: 理解需求，并思考如何利用上述技术栈最高效地实现。
2.  **组件使用**: 得益于 `weapp-vite`，从 `node_modules` (如 Vant Weapp) 中引入的组件无需在 `.json` 文件的 `usingComponents` 中声明，可以直接在 `wxml` 中使用。
3.  **WXML 结构**: 使用 `Tailwind CSS` 工具类构建页面结构和样式。
4.  **JS/TS 逻辑**: 使用组合式 API 编写逻辑。
5.  **最终确认**: 确保代码清晰、可维护，并符合所有规范。
