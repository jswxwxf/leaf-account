---
description: 使用 Taskmaster 管理任务驱动开发工作流的指南。
globs: ["**/*"]
alwaysApply: true
---

# Taskmaster 开发工作流

本指南概述了使用 Taskmaster 管理软件开发项目的标准流程。本文档是为作为 AI 代理的您编写的一套指令。

- **您的默认立场**: 对于大多数项目，用户可以直接在 `master` 任务上下文中工作。您的初始操作应在此默认上下文中进行，除非出现需要多上下文工作的明确模式。
- **您的目标**: 您的角色是通过在检测到适当上下文时智能地引入**带标签的任务列表**等高级功能，来提升用户的工作流。不要强迫用户使用标签；应将其作为针对特定需求的有用解决方案来建议。

## 基本循环

您将协助完成的基本开发周期如下:

1.  **`list`**: 向用户显示需要做什么。
2.  **`next`**: 帮助用户决定下一步做什么。
3.  **`show <id>`**: 提供特定任务的详细信息。
4.  **`expand <id>`**: 将复杂的任务分解为更小、可管理的子任务。
5.  **实现**: 用户编写代码和测试。
6.  **`update-subtask`**: 代表用户记录进度和发现。
7.  **`set-status`**: 在工作完成时将任务和子任务标记为 `done`。
8.  **重复**。

您所有的标准命令执行都应在用户当前的-任务上下文中操作，默认为 `master`。

---

## 标准开发工作流流程

### 简单工作流 (默认起点)

对于新项目或用户刚开始时，请在 `master` 标签上下文中操作:

- 通过运行 `initialize_project` 工具 / `task-master init` 或 `parse_prd` / `task-master parse-prd --input='<prd-file.txt>'` (参见 @`taskmaster.mdc`) 来启动新项目，以生成带有标签结构的初始 tasks.json。
- 在初始化期间使用 `--rules` 标志配置规则集 (例如, `task-master init --rules cursor,windsurf`) 或稍后使用 `task-master rules add/remove` 命令进行管理。
- 使用 `get_tasks` / `task-master list` (参见 @`taskmaster.mdc`) 开始编码会话，以查看当前任务、状态和 ID。
- 使用 `next_task` / `task-master next` (参见 @`taskmaster.mdc`) 确定下一个要处理的任务。
- 在分解任务之前，使用 `analyze_project_complexity` / `task-master analyze-complexity --research` (参见 @`taskmaster.mdc`) 分析任务复杂性。
- 使用 `complexity_report` / `task-master complexity-report` (参见 @`taskmaster.mdc`) 审查复杂性报告。
- 根据依赖关系（所有标记为 'done'）、优先级和 ID 顺序选择任务。
- 使用 `get_task` / `task-master show <id>` (参见 @`taskmaster.mdc`) 查看特定任务的详细信息，以了解实现要求。
- 使用 `expand_task` / `task-master expand --id=<id> --force --research` (参见 @`taskmaster.mdc`) 并附带适当的标志（如 `--force` 替换现有子任务和 `--research`）来分解复杂任务。
- 遵循任务细节、依赖关系和项目标准来实现代码。
- 使用 `set_task_status` / `task-master set-status --id=<id> --status=done` (参见 @`taskmaster.mdc`) 标记已完成的任务。
- 当实现与原始计划不同时，使用 `update` / `task-master update --from=<id> --prompt="..."` 或 `update_task` / `task-master update-task --id=<id> --prompt="..."` (参见 @`taskmaster.mdc`) 更新相关任务。

---

## 升级：由代理引导的多上下文工作流

虽然基本工作流功能强大，但您增加价值的主要机会在于识别何时引入**带标签的任务列表**。这些模式是您为用户创建更有条理、更高效的开发环境的工具，特别是当您在同一会话中检测到代理式或并行开发时。

**关键原则**: 大多数用户的体验不应有任何差异。仅当您检测到项目已超越简单任务管理的明确指标时，才引入高级工作流。

### 何时引入标签：您的决策模式

以下是需要寻找的模式。当您检测到其中一种时，应向用户提议相应的工作流。

#### 模式 1: 简单的 Git 功能分支
这是最常见和最直接的标签用例。

- **触发**: 用户创建一个新的 git 分支 (例如, `git checkout -b feature/user-auth`)。
- **您的行动**: 提议创建一个与分支名称相对应的新标签，以将该功能的任务与 `master` 隔离。
- **您的建议提示**: _"我看到您创建了一个名为 'feature/user-auth' 的新分支。为了让所有相关任务整齐地组织起来并与主列表分开，我可以为您创建一个相应的任务标签。这有助于以后防止 `tasks.json` 文件中的合并冲突。要我创建 'feature-user-auth' 标签吗？"_
- **要使用的工具**: `task-master add-tag --from-branch`

#### 模式 2: 团队协作
- **触发**: 用户提到与团队成员合作 (例如, "我的队友 Alice 正在处理数据库模式," 或 "我需要审查 Bob 在 API 上的工作。")。
- **您的行动**: 建议为用户的工作创建一个单独的标签，以防止与共享的 master 上下文冲突。
- **您的建议提示**: _"既然您正在与 Alice 合作，我可以为您的工作创建一个单独的任务上下文以避免冲突。这样，Alice 可以继续使用主列表，而您有自己隔离的上下文。当您准备好合并您的工作时，我们可以将任务协调回 master。要为您的当前工作创建一个标签吗？"_
- **要使用的工具**: `task-master add-tag my-work --copy-from-current --description="与 Alice 协作期间我的任务"`

#### 模式 3: 实验或有风险的重构
- **触发**: 用户想尝试一些可能不会保留的东西 (例如, "我想实验一下切换我们的状态管理库," 或 "我们来重构旧的 API 模块，但我想保留当前任务作为参考。")。
- **您的行动**: 提议为实验性工作创建一个沙盒化的标签。
- **您的建议提示**: _"这听起来是个很棒的实验。为了将这些新任务与我们的主计划分开，我可以为此工作创建一个临时的 'experiment-zustand' 标签。如果我们决定不继续，我们可以简单地删除该标签，而不会影响主任务列表。听起来不错吧？"_
- **要使用的工具**: `task-master add-tag experiment-zustand --description="探索 Zustand 迁移"`

#### 模式 4: 大型功能计划 (PRD 驱动)
这是针对重要新功能或史诗的更结构化的方法。

- **触发**: 用户描述一个需要正式计划的大型、多步骤功能。
- **您的行动**: 提议一个全面的、由 PRD 驱动的工作流。
- **您的建议提示**: _"这听起来像一个重要的新功能。为了有效管理，我建议我们为其创建一个专用的任务上下文。计划是这样的：我将创建一个名为 'feature-xyz' 的新标签，然后我们可以一起起草一份产品需求文档 (PRD) 来确定工作范围。一旦 PRD 准备就绪，我将自动在该新标签内生成所有必要的任务。您觉得怎么样？"_
- **您的实现流程**:
  1.  **创建一个空标签**: `task-master add-tag feature-xyz --description "新 XYZ 功能的任务"`。如果适用，您也可以先创建一个 git 分支，然后从该分支创建标签。
  2.  **协作与创建 PRD**: 与用户合作创建详细的 PRD 文件 (例如, `.taskmaster/docs/feature-xyz-prd.txt`)。
  3.  **将 PRD 解析到新标签中**: `task-master parse-prd .taskmaster/docs/feature-xyz-prd.txt --tag feature-xyz`
  4.  **准备新任务列表**: 后续建议对新创建的任务在 `feature-xyz` 标签内运行 `analyze-complexity` 和 `expand-all`。

#### 模式 5: 基于版本的开发
根据标签名称所指示的项目成熟度来调整您的方法。

- **原型/MVP 标签** (`prototype`, `mvp`, `poc`, `v0.x`):
  - **您的方法**: 关注速度和功能而非完美
  - **任务生成**: 创建强调“让它工作”而非“让它完美”的任务
  - **复杂性级别**: 较低的复杂性，较少的子任务，更直接的实现路径
  - **研究提示**: 包括“这是一个原型 - 优先考虑速度和基本功能而非优化”等上下文
  - **示例提示补充**: _"由于这是为了 MVP，我将专注于能快速实现核心功能的任务，而不是过度工程化。"_

- **生产/成熟标签** (`v1.0+`, `production`, `stable`):
  - **您的方法**: 强调健壮性、测试和可维护性
  - **任务生成**: 包括全面的错误处理、测试、文档和优化
  - **复杂性级别**: 更高的复杂性，更详细的子任务，更周密的实现路径
  - **研究提示**: 包括“这是为了生产 - 优先考虑可靠性、性能和可维护性”等上下文
  - **示例提示补充**: _"由于这是为了生产，我将确保任务包括适当的错误处理、测试和文档。"_

### 高级工作流 (基于标签和 PRD 驱动)

**何时过渡**: 识别项目何时已发展（或已在现有代码上启动项目）超越简单的任务管理。寻找这些指标:
- 用户提到团队成员或协作需求
- 项目已增长到 15 个以上具有混合优先级的任务
- 用户创建功能分支或提到重大计划
- 用户在现有的复杂代码库上初始化 Taskmaster
- 用户描述需要专门规划的大型功能

**您在过渡中的角色**: 引导用户采用更复杂的工作流，利用标签进行组织，利用 PRD 进行全面规划。

#### Master 列表策略 (高价值聚焦)
一旦您过渡到基于标签的工作流，`master` 标签理想情况下应只包含:
- **提供重要业务价值的高级可交付成果**
- **主要里程碑和史诗级功能**
- **影响整个项目的关键基础设施工作**
- **阻止发布的项目**

**不应放入 master 的内容**:
- 详细的实现子任务 (这些应放在特定功能标签的父任务中)
- 重构工作 (创建专门的标签，如 `refactor-auth`)
- 实验性功能 (使用 `experiment-*` 标签)
- 特定团队成员的任务 (使用个人特定的标签)

#### PRD 驱动的功能开发

**对于新的主要功能**:
1.  **识别计划**: 当用户描述一个重要功能时
2.  **创建专用标签**: `add_tag feature-[name] --description="[功能描述]"`
3.  **协作创建 PRD**: 与用户合作在 `.taskmaster/docs/feature-[name]-prd.txt` 中创建全面的 PRD
4.  **解析与准备**:
    - `parse_prd .taskmaster/docs/feature-[name]-prd.txt --tag=feature-[name]`
    - `analyze_project_complexity --tag=feature-[name] --research`
    - `expand_all --tag=feature-[name] --research`
5.  **添加 Master 引用**: 在 `master` 中创建一个引用该功能标签的高级任务

**对于现有代码库分析**:
当用户在现有项目上初始化 Taskmaster 时:
1.  **代码库发现**: 使用您的原生工具生成关于代码库的深度上下文。您可以使用带有 `--tree` 和 `--files` 的 `research` 工具，以现有架构为上下文收集最新信息。
2.  **协作评估**: 与用户合作识别改进领域、技术债务或新功能
3.  **战略性 PRD 创建**: 共同撰写包括以下内容的 PRD:
    - 当前状态分析 (基于您的代码库研究)
    - 建议的改进或新功能
    - 考虑现有代码的实施策略
4.  **基于标签的组织**: 将 PRD 解析到适当的标签中 (`refactor-api`, `feature-dashboard`, `tech-debt` 等)
5.  **Master 列表策划**: 只在 master 中保留最有价值的计划

parse-prd 的 `--append` 标志使用户能够在标签内或跨标签解析多个 PRD。PRD 应重点突出，解析成的任务数量应根据 PRD 的复杂性和详细程度进行战略性选择。

### 工作流过渡示例

**示例 1: 简单 → 基于团队**
```
用户: "Alice 将帮助处理 API 工作"
您的回应: "太好了！为了避免冲突，我将为您的工作创建一个单独的任务上下文。Alice 可以继续使用主列表，而您在自己的上下文中工作。当您准备好合并时，我们可以将任务协调回一起。"
行动: add_tag my-api-work --copy-from-current --description="与 Alice 协作期间我的 API 任务"
```

**示例 2: 简单 → PRD 驱动**
```
用户: "我想添加一个完整的用户仪表板，包括分析、用户管理和报告"
您的回应: "这听起来像一个需要详细规划的主要功能。让我为这项工作创建一个专门的上下文，我们可以一起起草一份 PRD，以确保我们涵盖所有需求。"
行动:
1. add_tag feature-dashboard --description="带分析和管理的用户仪表板"
2. 协作创建 PRD
3. parse_prd dashboard-prd.txt --tag=feature-dashboard
4. 在 master 中添加高级“用户仪表板”任务
```

**示例 3: 现有项目 → 战略规划**
```
用户: "我刚在我现有的 React 应用上初始化了 Taskmaster。它变得越来越乱，我想改进它。"
您的回应: "让我研究一下您的代码库以了解当前架构，然后我们可以为改进制定一个战略计划。"
行动:
1. research "当前 React 应用架构和改进机会" --tree --files=src/
2. 根据发现协作制定改进 PRD
3. 为不同的改进领域创建标签 (refactor-components, improve-state-management 等)
4. 只在 master 中保留主要的改进计划
```

---

## 主要交互: MCP 服务器 vs. CLI

Taskmaster 提供两种主要的交互方式:

1.  **MCP 服务器 (推荐用于集成工具)**:
    - 对于 AI 代理和集成开发环境 (如 Cursor), 通过 **MCP 服务器**进行交互是首选方法。
    - MCP 服务器通过一组工具 (例如, `get_tasks`, `add_subtask`) 暴露 Taskmaster 的功能。
    - 与 CLI 解析相比，此方法提供更好的性能、结构化数据交换和更丰富的错误处理。
    - 有关 MCP 架构和可用工具的详细信息，请参阅 @`mcp.mdc`。
    - MCP 工具及其相应 CLI 命令的完整列表和描述可在 @`taskmaster.mdc` 中找到。
    - 如果 `scripts/modules` 中的核心逻辑或 MCP 工具/直接功能定义发生更改，请**重新启动 MCP 服务器**。
    - **注意**: MCP 工具完全支持带标签的任务列表，并具有完整的标签管理功能。

2.  **`task-master` CLI (供用户和备用)**:
    - 全局 `task-master` 命令为直接终端交互提供了一个用户友好的界面。
    - 如果 MCP 服务器无法访问或特定功能未通过 MCP 暴露，它也可以作为备用方案。
    - 使用 `npm install -g task-master-ai` 全局安装，或通过 `npx task-master-ai ...` 本地使用。
    - CLI 命令通常与 MCP 工具相对应 (例如, `task-master list` 对应 `get_tasks`)。
    - 详细的命令参考请参阅 @`taskmaster.mdc`。
    - **带标签的任务列表**: CLI 完全支持新的带标签系统，并实现无缝迁移。

## 标签系统如何工作 (供您参考)

- **数据结构**: 任务被组织到不同的上下文（标签）中，如 "master"、"feature-branch" 或 "v2.0"。
- **静默迁移**: 现有项目自动迁移以使用 "master" 标签，零中断。
- **上下文隔离**: 不同标签中的任务是完全分开的。一个标签中的更改不会影响任何其他标签。
- **手动控制**: 用户始终在控制之中。没有自动切换。您通过使用 `use-tag <name>` 来协助切换。
- **完整的 CLI 和 MCP 支持**: 所有标签管理命令都可通过 CLI 和 MCP 工具使用。完整的命令列表请参阅 @`taskmaster.mdc`。

---

## 任务复杂性分析

-   运行 `analyze_project_complexity` / `task-master analyze-complexity --research` (参见 @`taskmaster.mdc`) 进行全面分析
-   通过 `complexity_report` / `task-master complexity-report` (参见 @`taskmaster.mdc`) 查看格式化、可读的复杂性报告。
-   专注于复杂性得分最高的任务 (8-10) 进行详细分解
-   使用分析结果确定适当的子任务分配
-   注意，报告会自动被 `expand_task` 工具/命令使用

## 任务分解过程

-   使用 `expand_task` / `task-master expand --id=<id>`。如果找到复杂性报告，它会自动使用；否则生成默认数量的子任务。
-   使用 `--num=<number>` 指定明确的子任务数量，覆盖默认值或复杂性报告的建议。
-   添加 `--research` 标志以利用 Perplexity AI 进行有研究支持的扩展。
-   添加 `--force` 标志以在生成新子任务前清除现有子任务（默认为附加）。
-   在需要时使用 `--prompt="<context>"` 提供额外的上下文。
-   根据需要审查和调整生成的子任务。
-   使用 `expand_all` 工具或 `task-master expand --all` 一次性扩展多个待处理任务，并遵循 `--force` 和 `--research` 等标志。
-   如果子任务需要完全替换（无论 `expand` 上的 `--force` 标志如何），请先用 `clear_subtasks` / `task-master clear-subtasks --id=<id>` 清除它们。

## 实现偏差处理

-   当实现与计划方法显著不同时
-   当未来任务因当前实现选择需要修改时
-   当出现新的依赖或需求时
-   使用 `update` / `task-master update --from=<futureTaskId> --prompt='<explanation>\nUpdate context...' --research` 更新多个未来任务。
-   使用 `update_task` / `task-master update-task --id=<taskId> --prompt='<explanation>\nUpdate context...' --research` 更新单个特定任务。

## 任务状态管理

-   对准备开始的任务使用 'pending'
-   对已完成和已验证的任务使用 'done'
-   对推迟的任务使用 'deferred'
-   根据项目特定工作流需要添加自定义状态值

## 任务结构字段

- **id**: 任务的唯一标识符 (示例: `1`, `1.1`)
- **title**: 简短、描述性的标题 (示例: `"初始化仓库"`)
- **description**: 任务涉及内容的简明摘要 (示例: `"创建一个新仓库，设置初始结构。"`)
- **status**: 任务的当前状态 (示例: `"pending"`, `"done"`, `"deferred"`)
- **dependencies**: 先决任务的 ID (示例: `[1, 2.1]`)
  - 依赖项以状态指示器显示 (✅ 表示已完成, ⏱️ 表示待处理)
  - 这有助于快速识别哪些先决任务正在阻塞工作
- **priority**: 重要性级别 (示例: `"high"`, `"medium"`, `"low"`)
- **details**: 深入的实现说明 (示例: `"使用 GitHub 客户端 ID/密钥，处理回调，设置会话令牌。"`)
- **testStrategy**: 验证方法 (示例: `"部署并调用端点以确认 'Hello World' 响应。"`)
- **subtasks**: 更小、更具体的任务列表 (示例: `[{"id": 1, "title": "配置 OAuth", ...}]`)
- 参考任务结构细节 (之前链接到 `tasks.mdc`)。

## 配置管理 (更新)

Taskmaster 配置通过两种主要机制进行管理:

1.  **`.taskmaster/config.json` 文件 (主要)**:
    -   位于项目根目录。
    -   存储大多数配置设置：AI 模型选择（主要、研究、备用）、参数（最大令牌数、温度）、日志级别、默认子任务/优先级、项目名称等。
    -   **带标签系统设置**: 包括 `global.defaultTag` (默认为 "master") 和用于标签管理配置的 `tags` 部分。
    -   **通过 `task-master models --setup` 命令管理。** 除非您知道自己在做什么，否则不要手动编辑。
    -   **通过 `task-master models` 命令或 `models` MCP 工具查看/设置特定模型。**
    -   在您首次运行 `task-master models --setup` 或在带标签系统迁移期间自动创建。

2.  **环境变量 (`.env` / `mcp.json`)**:
    -   **仅**用于敏感的 API 密钥和特定的端点 URL。
    -   将 API 密钥（每个提供商一个）放在项目根目录的 `.env` 文件中以供 CLI 使用。
    -   对于 MCP/Cursor 集成，在 `.cursor/mcp.json` 的 `env` 部分配置这些密钥。
    -   可用密钥/变量：请参阅 `assets/env.example` 或命令参考中的配置部分 (之前链接到 `taskmaster.mdc`)。

3.  **`.taskmaster/state.json` 文件 (带标签系统状态)**:
    -   跟踪当前标签上下文和迁移状态。
    -   在带标签系统迁移期间自动创建。
    -   包含: `currentTag`, `lastSwitched`, `migrationNoticeShown`。

**重要提示:** 非 API 密钥设置（如模型选择、`MAX_TOKENS`、`TASKMASTER_LOG_LEVEL`）**不再通过环境变量配置**。请使用 `task-master models` 命令（或 `--setup` 进行交互式配置）或 `models` MCP 工具。
**如果 AI 命令在 MCP 中失败**，请验证所选提供商的 API 密钥是否存在于 `.cursor/mcp.json` 的 `env` 部分。
**如果 AI 命令在 CLI 中失败**，请验证所选提供商的 API 密钥是否存在于项目根目录的 `.env` 文件中。

## 规则管理

Taskmaster 支持多个 AI 编码助手规则集，可在项目初始化期间配置或之后管理:

- **可用配置文件**: Claude Code, Cline, Codex, Cursor, Roo Code, Trae, Windsurf (claude, cline, codex, cursor, roo, trae, windsurf)
- **初始化期间**: 使用 `task-master init --rules cursor,windsurf` 指定要包括的规则集
- **初始化后**: 使用 `task-master rules add <profiles>` 或 `task-master rules remove <profiles>` 管理规则集
- **交互式设置**: 使用 `task-master rules setup` 启动交互式提示以选择规则配置文件
- **默认行为**: 如果在初始化期间未指定 `--rules` 标志，则包括所有可用的规则配置文件
- **规则结构**: 每个配置文件创建自己的目录 (例如, `.cursor/rules`, `.roo/rules`) 并带有适当的配置文件

## 确定下一个任务

- 运行 `next_task` / `task-master next` 显示下一个要处理的任务。
- 该命令识别所有依赖项已满足的任务
- 任务按优先级、依赖项数量和 ID 进行排序
- 该命令显示全面的任务信息，包括:
  - 基本任务细节和描述
  - 实现细节
  - 子任务 (如果存在)
  - 上下文相关的建议操作
- 建议在开始任何新的开发工作之前运行
- 尊重您项目的依赖结构
- 确保任务按适当的顺序完成
- 为常见的任务操作提供即用型命令

## 查看特定任务详情

- 运行 `get_task` / `task-master show <id>` 查看特定任务。
- 对子任务使用点表示法: `task-master show 1.2` (显示任务 1 的子任务 2)
- 显示与 next 命令类似但针对特定任务的全面信息
- 对于父任务，显示所有子任务及其当前状态
- 对于子任务，显示父任务信息和关系
- 提供适合特定任务的上下文建议操作
- 用于在实现前检查任务细节或检查状态

## 管理任务依赖

- 使用 `add_dependency` / `task-master add-dependency --id=<id> --depends-on=<id>` 添加依赖。
- 使用 `remove_dependency` / `task-master remove-dependency --id=<id> --depends-on=<id>` 移除依赖。
- 系统防止循环依赖和重复的依赖项条目
- 在添加或移除依赖项之前检查其是否存在
- 依赖项更改后自动重新生成任务文件
- 依赖项在任务列表和文件中以状态指示器可视化

## 任务重组

- 使用 `move_task` / `task-master move --from=<id> --to=<id>` 在层次结构内移动任务或子任务
- 此命令支持多种用例:
  - 将独立任务移动为子任务 (例如, `--from=5 --to=7`)
  - 将子任务移动为独立任务 (例如, `--from=5.2 --to=7`)
  - 将子任务移动到不同的父任务 (例如, `--from=5.2 --to=7.3`)
  - 在同一父任务内重新排序子任务 (例如, `--from=5.2 --to=5.4`)
  - 将任务移动到新的、不存在的 ID 位置 (例如, `--from=5 --to=25`)
  - 使用逗号分隔的 ID 一次移动多个任务 (例如, `--from=10,11,12 --to=16,17,18`)
- 系统包括验证以防止数据丢失:
  - 允许通过创建占位符任务移动到不存在的 ID
  - 防止移动到已有内容的现有任务 ID (以避免覆盖)
  - 在尝试移动之前验证源任务是否存在
- 系统保持正确的父子关系和依赖完整性
- 移动操作后自动重新生成任务文件
- 这在组织和完善您的任务结构方面提供了更大的灵活性，随着项目理解的演变
- 这在处理因团队在不同分支上创建任务而可能出现的合并冲突时特别有用。通过移动您的任务并保留他们的任务，可以非常轻松地解决这些冲突。

## 迭代式子任务实现

一旦任务被分解为子任务，使用 `expand_task` 或类似方法，遵循此迭代过程进行实现:

1.  **理解目标 (准备)**:
    -   使用 `get_task` / `task-master show <subtaskId>` (参见 @`taskmaster.mdc`) 彻底了解子任务的具体目标和要求。

2.  **初步探索与规划 (迭代 1)**:
    -   这是创建具体实施计划的第一次尝试。
    -   探索代码库以确定需要修改的精确文件、函数，甚至特定的代码行。
    -   确定预期的代码更改 (diffs) 及其位置。
    -   从这个探索阶段收集*所有*相关细节。

3.  **记录计划**:
    -   运行 `update_subtask` / `task-master update-subtask --id=<subtaskId> --prompt='<detailed plan>'`。
    -   在提示中提供探索阶段的*完整和详细*的发现。包括文件路径、行号、建议的 diffs、理由以及任何已识别的潜在挑战。不要省略细节。目标是在子任务的 `details` 中创建一个丰富的、带时间戳的日志。

4.  **验证计划**:
    -   再次运行 `get_task` / `task-master show <subtaskId>` 以确认详细的实施计划已成功附加到子任务的详细信息中。

5.  **开始实施**:
    -   使用 `set_task_status` / `task-master set-status --id=<subtaskId> --status=in-progress` 设置子任务状态。
    -   根据记录的计划开始编码。

6.  **优化和记录进度 (迭代 2+)**:
    -   随着实施的进展，您会遇到挑战、发现细微差别或确认成功的方法。
    -   **在附加新信息之前**: 简要回顾子任务中记录的*现有*详细信息（使用 `get_task` 或从上下文中回忆），以确保更新增加了新的见解并避免冗余。
    -   **定期**使用 `update_subtask` / `task-master update-subtask --id=<subtaskId> --prompt='<update details>\n- 什么有效...\n- 什么无效...'` 附加新的发现。
    -   **关键是记录**:
        -   什么有效（发现的“基本真理”）。
        -   什么无效及其原因（以避免重复错误）。
        -   成功的特定代码片段或配置。
        -   做出的决定，特别是如果与用户输入确认过。
        -   任何偏离初始计划的情况及其理由。
    -   目标是不断丰富子任务的详细信息，创建一个实施过程的日志，帮助 AI（和人类开发人员）学习、适应和避免重复错误。

7.  **审查和更新规则 (实施后)**:
    -   一旦子任务的实施功能上完成，审查所有代码更改和相关的聊天记录。
    -   识别在实施过程中建立的任何新的或修改过的代码模式、约定或最佳实践。
    -   根据内部指南（之前链接到 `cursor_rules.mdc` 和 `self_improve.mdc`）创建新的或更新现有的规则。

8.  **标记任务完成**:
    -   在验证实施并更新任何必要的规则后，将子任务标记为已完成: `set_task_status` / `task-master set-status --id=<subtaskId> --status=done`。

9.  **提交更改 (如果使用 Git)**:
    -   暂存相关的代码更改和任何更新/新的规则文件 (`git add .`)。
    -   撰写一个全面的 Git 提交消息，总结为子任务所做的工作，包括代码实施和任何规则调整。
    -   直接在终端中执行提交命令 (例如, `git commit -m 'feat(module): Implement feature X for subtask <subtaskId>\n\n- Details about changes...\n- Updated rule Y for pattern Z'`)。
    -   根据内部版本控制指南（之前链接到 `changeset.mdc`）考虑是否需要 Changeset。如果是，运行 `npm run changeset`，暂存生成的文件，并修改提交或创建一个新的提交。

10. **进行到下一个子任务**:
    -   识别下一个子任务 (例如, 使用 `next_task` / `task-master next`)。

## 代码分析与重构技术

- **顶层函数搜索**:
  - 用于理解模块结构或规划重构。
  - 使用 grep/ripgrep 查找导出的函数/常量:
    `rg "export (async function|function|const) \w+"` 或类似模式。
  - 可以在迁移期间帮助比较文件之间的函数或识别潜在的命名冲突。

---
_此工作流提供了一个通用指南。请根据您的特定项目需求和团队实践进行调整。_
