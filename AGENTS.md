# Leaf Account 项目中的 AI 代理

本项目利用 AI 代理来协助开发和维护个人财务管理的微信小程序。 这些代理遵循项目指南、编码规范和最佳实践，负责代码生成、错误修复，并提出改进建议，以提高开发效率和代码质量。

## 核心技术

*   **前端**: `@vue-mini/core`, Tailwind CSS, Vant Weapp
*   **后端**: CloudBase (腾讯云)

## AI 代理角色

*   **代码生成**:
    *   为组件、页面和 API 请求生成样板代码，遵循 `@vue-mini/core` 的组合式 API 规范。
    *   根据 `tech_stack.md` 中定义的组件优先原则，优先使用 `Vant Weapp` 提供的组件。
*   **代码审查**:
    *   识别潜在问题并建议改进现有代码，严格遵守 `coding_standards.md` 中定义的所有规范，包括文件格式、代码风格和命名约定等。
    *   检查代码是否符合微信小程序规范，例如 WXML 标签和属性的使用、数据绑定和事件绑定等。
*   **Bug 修复**: 分析错误日志并提出修复错误的解决方案，尤其是在云函数中，需要考虑数据库权限和安全问题。
*   **文档**: 为组件、API 和云函数生成文档，确保文档清晰、易懂，并符合 JSDoc 风格。
*   **任务管理**:
    *   协助任务分解、计划和跟踪使用 Taskmaster 的进度，参考 `taskmaster_dev_workflow.md` 中定义的工作流程。
    *   根据复杂性分析报告，将复杂的任务分解为更小、可管理的子任务。

## 专业领域规则文件

AI 代理在不同开发场景中会参考对应的规则文件，以避免规则互相干扰，保证开发质量。

*   `rules/web-development.mdc`: 描述前端 + 云开发 CloudBase 项目开发的专业规则。
*   `rules/miniprogram-development.mdc`: 描述微信小程序开发的专业规则。
*   `rules/cloudbase-platform.mdc`: 描述 CloudBase 平台的核心知识。
*   `rules/workflows.mdc`: 描述开发工作流程。
*   `rules/database.mdc`: 描述云开发 CloudBase 数据库操作的专业规则。
*   `rules/ui-design.mdc`: 描述 web/小程序等页面设计和 UI 规范。
