# 微信小程序 (前端) 中的 AI 代理

本项目利用 AI 代理来协助开发和维护微信小程序前端。 这些代理遵循项目指南、编码规范和最佳实践，负责代码生成、错误修复，并根据项目指南和最佳实践提出改进建议，特别是对于前端。

## 核心技术

*   **框架**: `@vue-mini/core` (使用类似 Vue 3 的组合式 API)
*   **样式**: `Tailwind CSS` (优先使用原子化 CSS), `Vant Weapp` (按需使用，与 Tailwind 结合)
*   **构建工具**: `weapp-vite`
*   **编程语言**: `JavaScript`
*   **代码规范**: 遵循 `coding_standards.md` 中定义的规范

## AI 代理角色

*   **页面和组件开发**:
    *   使用 `@vue-mini/core` 的组合式 API (`defineComponent`, `ref`, `reactive` 等) 构建页面和组件的逻辑。
    *   优先使用 `Tailwind CSS` 原子化类进行样式开发，保持 WXML 文件的整洁，遵循 `ui-design.mdc` 中定义的 UI 规范。
    *   按需使用 `Vant Weapp` 组件，提升开发效率，遵循 `tech_stack.md` 中定义的组件优先原则。
*   **代码审查**:
    *   检查 WXML 结构是否清晰、合理，Tailwind CSS 类是否使用正确。
    *   确保 JavaScript 代码符合 `coding_standards.md` 中定义的命名、格式和代码组织规范。
    *   检查组件属性 (Props) 和事件处理函数是否符合命名规范。
*   **Bug 修复**: 分析错误日志，并根据微信小程序官方文档和 `@vue-mini/core` 框架的最佳实践，提出修复错误的解决方案。
*   **性能优化**: 关注小程序的性能，包括启动速度、页面渲染和数据更新的效率，并提出优化建议。

## 专业领域规则文件

AI 代理在微信小程序前端开发场景中会参考以下规则文件：

*   `rules/miniprogram-development.mdc`: 描述微信小程序开发的专业规则，包含小程序项目结构和配置、微信云开发能力集成、小程序特有的 API 和权限处理等。
*   `rules/ui-design.mdc`: 描述 web/小程序等页面设计和 UI 规范，包含高保真原型设计流程、UI 设计规范和工具选择、前端样式处理等。
*   `rules/workflows.mdc`: 描述开发工作流程，包含部署流程、素材下载和知识库查询、文档和配置文件生成规则、MCP 接口调用规范等。
