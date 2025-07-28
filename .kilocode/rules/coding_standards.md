# Coding Standards

本文档旨在为项目提供一套统一的编码规范，以提高代码质量、可读性和可维护性。所有项目成员都应遵循这些规范。

## 1. 文件格式

所有文本文件都应遵循以下基本格式：

- **字符集**: `utf-8`
- **换行符**: `lf` (Unix-style)
- **行尾空格**: 自动删除
- **文件末尾空行**: 自动添加

这些规则由根目录下的 `.editorconfig` 文件强制执行。

## 2. 代码格式化 (Prettier)

我们使用 [Prettier](https://prettier.io/) 来统一代码风格。规则定义在 `.prettierrc.json` 中。

主要规则如下:

- **缩进**: 2 个空格 (`indent_size: 2`)
- **分号**: 不使用分号 (`semi: false`)
- **引号**: 使用单引号 (`singleQuote: true`)
- **尾随逗号**: 在所有可能的地方使用 (`trailingComma: "all"`)

请确保你的编辑器已经安装并启用了 Prettier 插件，以便在保存文件时自动格式化。

## 3. JavaScript & TypeScript (ESLint)

我们使用 [ESLint](https://eslint.org/) 来进行代码质量检查和风格约束。配置基于 [`@icebreakers/eslint-config`](https://github.com/ice-lab/fe-materials/tree/master/packages/eslint-config)，它扩展自广受好评的 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config)。

这套配置旨在提供一套固执己见但又非常实用的规则，以最大限度地提高代码的一致性和可读性。

### TypeScript

`tsconfig.json` 文件定义了 TypeScript 的编译选项。其中一些关键配置需要特别注意：

- `"strict": true`: 启用所有严格类型检查选项。
- `"noUnusedLocals": true`: 不允许未使用的局部变量。
- `"noUnusedParameters": true`: 不允许未使用的参数。
- `"moduleResolution": "bundler"`: 使用现代的模块解析策略。

### 模块导入路径

为了提高代码的可读性和可维护性，本项目约定使用路径别名来简化模块导入。

- **路径别名**: 项目已在 `vite.config.mts` 和 `tsconfig.json` 中配置了 `@` 别名，它指向 `miniprogram` 根目录。
- **使用规范**: 当模块引用层级超过两层（即出现 `../../`）时，应强制使用 `@` 别名路径。
- **文件后缀**: 由于 `weapp-vite` 的限制，使用别名时 **必须** 带上 `.js` 文件后缀。

```typescript
// 推荐
import { getDayOfWeek } from '@/utils/date.js'
import { getBills } from '@/api/bill.js'

// 不推荐
import { getDayOfWeek } from '../../utils/date'
```

## 4. CSS (Tailwind CSS & Less)

项目使用 [Tailwind CSS](https://tailwindcss.com/) 进行样式开发，并使用 [Less](https://lesscss.org/)作为 CSS 预处理器。

- **Tailwind CSS**: 优先使用原子化 CSS 类来构建界面。
- **Less**: 对于无法通过 Tailwind 实现的复杂样式或可重用组件，可以使用 Less 编写。

配置文件为 `tailwind.config.js`, `postcss.config.js`。

## 5. 命名规范

- **变量和函数**: 使用小驼峰命名法 (camelCase)。例如：`const myVariable = ...`
- **类和类型**: 使用大驼峰命名法 (PascalCase)。例如：`class MyClass { ... }`
- **文件名 (微信小程序)**:
    - **页面和组件目录**: 使用小写连字符命名 (kebab-case)，例如 `user-profile`。
    - **WXML, Less, TS 文件**: 在各自的目录中，通常统一命名为 `index.wxml`, `index.less`, `index.ts`。

## 6. 版本控制 (Git)

所有提交都应遵循标准的提交信息格式。根目录下的 `.gitignore` 文件定义了需要被版本控制系统忽略的文件和目录。在提交代码前，请确保没有将不必要的文件（如 `node_modules`, `dist` 等）添加到仓库中。

## 7. 微信小程序规范

本项目使用 `@vue-mini/core` 框架，它允许我们使用 Vue-like 的语法来开发小程序。

### WXML

- **标签**: 总是使用小写标签名，例如 `<view>` 而不是 `<View>`。
- **属性**: 属性名也应为小写。
- **数据绑定**: 使用 `{{ }}` 语法进行数据绑定。
- **事件绑定**: 使用 `@` 符号来绑定事件，例如 `@tap`。这比原生的 `bind:tap` 或 `catch:tap` 更简洁。

### 逻辑层 (TypeScript)

- 使用 `defineComponent` 来定义页面或组件。
- 响应式数据应使用 `ref` 或 `reactive` 创建。
- **组件属性 (Props)**: 外部传入的属性（`props`）名应使用小驼峰命名法 (camelCase)。
- **事件处理函数**: 事件处理函数名应使用小驼峰命名法，并以 `handle` 或 `on` 作为前缀，例如 `handleClick` 或 `onShow`。
- **自定义事件**: 组件对外触发的自定义事件，其名称应使用小写连字符命名 (kebab-case)。在 WXML 中绑定时，也使用小写连字符，例如 `@value-change="handleValueChange"`。
- 尽量保持逻辑层的代码简洁和专注。复杂的业务逻辑应抽离到独立的 `utils` 或 `services` 中。

### 样式 (WXML & Less)

- **优先使用 Tailwind CSS**: 尽可能通过 `WXML` 中的原子化 CSS 类来定义样式。
- **避免内联样式**: 除非是动态计算的样式，否则应避免使用 `style` 属性。
- **Less 文件**: 仅用于定义一些无法通过 Tailwind 实现的复杂样式、或全局样式变量。通常情况下，页面级别的 `.less` 文件应该是空的。

## 8. 代码注释

清晰的注释是代码可维护性的关键。

- **原则**: 注释的目的是解释代码的“为什么”，而不是“做什么”。避免对显而易见的代码进行注释。
- **时机**:
  - 对于复杂的业务逻辑、算法或正则表达式，应添加注释。
  - 对于临时解决方案或待办事项，使用 `// TODO:` 或 `// FIXME:` 标记。
- **风格**:
  - **函数和类**: 推荐使用 JSDoc 风格的块注释，以描述其功能、参数和返回值。
  - **行内注释**: 对于单行或代码块的简短说明，使用 `//`。
