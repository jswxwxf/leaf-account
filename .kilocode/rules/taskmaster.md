---
description: Taskmaster MCP 工具和 CLI 命令的综合参考手册。
globs: ["**/*"]
alwaysApply: true
---

# Taskmaster 工具与命令参考手册

本文档为 Taskmaster 的交互提供了详细的参考，涵盖了推荐的 MCP 工具（适用于像 Cursor 这样的集成环境）和相应的 `task-master` CLI 命令（专为用户直接交互或作为备用方案设计）。

**注意：** 对于通过编程方式或集成工具与 Taskmaster 交互，强烈推荐使用 **MCP 工具**，因为它们具有更好的性能、结构化数据和错误处理能力。CLI 命令则作为一种用户友好的备用选择。

**重要提示：** 部分 MCP 工具涉及 AI 处理... 这些由 AI 驱动的工具包括 `parse_prd`、`analyze_project_complexity`、`update_subtask`、`update_task`、`update`、`expand_all`、`expand_task` 和 `add_task`。

**🏷️ 带标签的任务列表系统：** Taskmaster 现在支持**带标签的任务列表**，用于多上下文任务管理。这使您可以为不同的功能、分支或实验维护独立、隔离的任务列表。现有项目会无缝迁移，使用默认的 "master" 标签。大多数命令现在支持 `--tag <name>` 标志，以指定要操作的上下文。如果省略，命令将使用当前活动的标签。

---

## 初始化与设置

### 1. 初始化项目 (`init`)

- **MCP 工具:** `initialize_project`
- **CLI 命令:** `task-master init [options]`
- **描述:** `在新项目的当前目录中设置 Taskmaster 的基本文件结构和配置。`
- **主要 CLI 选项:**
  - `--name <name>`: `在 Taskmaster 的配置中为您的项目设置名称。`
  - `--description <text>`: `为您的项目提供简短描述。`
  - `--version <version>`: `为您的项目设置初始版本，例如 '0.1.0'。`
  - `-y, --yes`: `使用默认设置快速初始化 Taskmaster，无需交互式提示。`
- **用法:** 在新项目开始时运行一次。
- **MCP 版本描述:** `通过运行 'task-master init' 命令，在当前目录中为新项目设置 Taskmaster 的基本文件结构和配置。`
- **主要 MCP 参数/选项:**
  - `projectName`: `为您的项目设置名称。` (CLI: `--name <name>`)
  - `projectDescription`: `为您的项目提供简短描述。` (CLI: `--description <text>`)
  - `projectVersion`: `为您的项目设置初始版本，例如 '0.1.0'。` (CLI: `--version <version>`)
  - `authorName`: `作者姓名。` (CLI: `--author <author>`)
  - `skipInstall`: `跳过自动安装依赖。默认为 false。` (CLI: `--skip-install`)
  - `addAliases`: `添加 shell 别名 tm 和 taskmaster。默认为 false。` (CLI: `--aliases`)
  - `yes`: `跳过提示并使用默认/提供的参数。默认为 false。` (CLI: `-y, --yes`)
- **用法:** 在新项目开始时运行一次，通常通过像 Cursor 这样的集成工具。在 MCP 服务器的当前工作目录上操作。
- **重要提示:** 完成后，您*必须*解析一个 PRD 以生成任务。在此之前不会有任务文件。初始化后的下一步是使用 .taskmaster/templates/example_prd.txt 中的示例 PRD 创建一个 PRD。
- **标签:** 使用 `--tag` 选项将 PRD 解析到特定的、非默认的标签上下文中。如果标签不存在，将自动创建。示例: `task-master parse-prd spec.txt --tag=new-feature`。

### 2. 解析 PRD (`parse_prd`)

- **MCP 工具:** `parse_prd`
- **CLI 命令:** `task-master parse-prd [file] [options]`
- **描述:** `使用 Taskmaster 解析产品需求文档（PRD）或文本文件，以在 tasks.json 中自动生成初始任务集。`
- **主要参数/选项:**
  - `input`: `您的 PRD 或需求文本文件的路径，Taskmaster 应解析该文件以获取任务。` (CLI: `[file]` 位置参数或 `-i, --input <file>`)
  - `output`: `指定 Taskmaster 应保存生成的 'tasks.json' 文件的位置。默认为 '.taskmaster/tasks/tasks.json'。` (CLI: `-o, --output <file>`)
  - `numTasks`: `Taskmaster 应从文档中生成的大致顶级任务数。` (CLI: `-n, --num-tasks <number>`)
  - `force`: `允许 Taskmaster 在没有确认的情况下覆盖现有的 'tasks.json'。` (CLI: `-f, --force`)
- **用法:** 用于从现有需求文档引导项目。
- **注意:** Taskmaster 将严格遵守 PRD 中提到的任何具体要求，如库、数据库模式、框架、技术栈等，同时填补 PRD 未完全指定的任何空白。任务旨在提供最直接的实现路径，同时避免过度工程化。
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。如果用户没有 PRD，建议讨论他们的想法，然后使用 `.taskmaster/templates/example_prd.txt` 中的示例 PRD 作为模板，根据他们的想法创建 PRD，以供 `parse-prd` 使用。

---

## AI 模型配置

### 2. 管理模型 (`models`)

- **MCP 工具:** `models`
- **CLI 命令:** `task-master models [options]`
- **描述:** `查看当前的 AI 模型配置，或为不同角色（主要、研究、备用）设置特定模型。允许为 Ollama 和 OpenRouter 设置自定义模型 ID。`
- **主要 MCP 参数/选项:**
  - `setMain <model_id>`: `设置用于任务生成/更新的主要模型 ID。` (CLI: `--set-main <model_id>`)
  - `setResearch <model_id>`: `设置用于研究支持操作的模型 ID。` (CLI: `--set-research <model_id>`)
  - `setFallback <model_id>`: `设置在主要模型失败时使用的模型 ID。` (CLI: `--set-fallback <model_id>`)
  - `ollama <boolean>`: `表示设置的模型 ID 是自定义的 Ollama 模型。` (CLI: `--ollama`)
  - `openrouter <boolean>`: `表示设置的模型 ID 是自定义的 OpenRouter 模型。` (CLI: `--openrouter`)
  - `listAvailableModels <boolean>`: `如果为 true，则列出当前未分配给任何角色的可用模型。` (CLI: 无直接等效项；CLI 会自动列出可用模型)
  - `projectRoot <string>`: `可选。项目的绝对根目录路径。` (CLI: 自动确定)
- **主要 CLI 选项:**
  - `--set-main <model_id>`: `设置主要模型。`
  - `--set-research <model_id>`: `设置研究模型。`
  - `--set-fallback <model_id>`: `设置备用模型。`
  - `--ollama`: `指定提供的模型 ID 用于 Ollama（与 --set-* 一起使用）。`
  - `--openrouter`: `指定提供的模型 ID 用于 OpenRouter（与 --set-* 一起使用）。会根据 OpenRouter API 进行验证。`
  - `--bedrock`: `指定提供的模型 ID 用于 AWS Bedrock（与 --set-* 一起使用）。`
  - `--setup`: `运行交互式设置以配置模型，包括自定义 Ollama/OpenRouter ID。`
- **用法 (MCP):** 不带 set 标志调用以获取当前配置。使用 `setMain`、`setResearch` 或 `setFallback` 并提供有效的模型 ID 来更新配置。使用 `listAvailableModels: true` 获取未分配模型的列表。要设置自定义模型，请提供模型 ID 并设置 `ollama: true` 或 `openrouter: true`。
- **用法 (CLI):** 不带标志运行以查看当前配置和可用模型。使用 set 标志更新特定角色。使用 `--setup` 进行引导式配置，包括自定义模型。要通过标志设置自定义模型，请使用 `--set-<role>=<model_id>` 以及 `--ollama` 或 `--openrouter`。
- **注意:** 配置存储在项目根目录的 `.taskmaster/config.json` 中。此命令/工具会修改该文件。使用 `listAvailableModels` 或 `task-master models` 查看内部支持的模型。OpenRouter 自定义模型会根据其线上 API 进行验证。Ollama 自定义模型不会进行线上验证。
- **API 注意:** 所选 AI 提供商（基于其模型）的 API 密钥需要存在于 mcp.json 文件中，才能在 MCP 上下文中访问。API 密钥必须存在于本地 .env 文件中，CLI 才能读取它们。
- **模型成本:** 支持的模型成本以美元表示。输入/输出值为 3 表示 3.00 美元。值为 0.8 表示 0.80 美元。
- **警告:** 不要手动编辑 .taskmaster/config.json 文件。根据需要使用 MCP 或 CLI 格式的附带命令。始终优先使用可用的 MCP 工具，并将 CLI 作为备用方案。

---

## 任务列表与查看

### 3. 获取任务 (`get_tasks`)

- **MCP 工具:** `get_tasks`
- **CLI 命令:** `task-master list [options]`
- **描述:** `列出您的 Taskmaster 任务，可选择按状态过滤并显示子任务。`
- **主要参数/选项:**
  - `status`: `仅显示与此状态匹配的 Taskmaster 任务（或多个状态，以逗号分隔），例如 'pending' 或 'done,in-progress'。` (CLI: `-s, --status <status>`)
  - `withSubtasks`: `在列表中将子任务缩进显示在其父任务下。` (CLI: `--with-subtasks`)
  - `tag`: `指定要从中列出任务的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 获取项目状态的概览，通常在工作会话开始时使用。

### 4. 获取下一个任务 (`next_task`)

- **MCP 工具:** `next_task`
- **CLI 命令:** `task-master next [options]`
- **描述:** `让 Taskmaster 根据状态和已完成的依赖项，显示您可以处理的下一个可用任务。`
- **主要参数/选项:**
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
  - `tag`: `指定要使用的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
- **用法:** 根据计划确定下一步要做什么。

### 5. 获取任务详情 (`get_task`)

- **MCP 工具:** `get_task`
- **CLI 命令:** `task-master show [id] [options]`
- **描述:** `按 ID 显示一个或多个特定 Taskmaster 任务或子任务的详细信息。`
- **主要参数/选项:**
  - `id`: `必需。您想查看的 Taskmaster 任务（例如 '15'）、子任务（例如 '15.2'）的 ID，或以逗号分隔的 ID 列表（'1,5,10.2'）。` (CLI: `[id]` 位置参数或 `-i, --id <id>`)
  - `tag`: `指定要从中获取任务的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 了解特定任务的全部细节。当提供多个 ID 时，会显示一个摘要表。
- **关键信息** 如果您需要从多个任务中收集信息，请使用逗号分隔的 ID（即 1,2,3）以接收任务数组。如果您需要获取多个任务，请不要不必要地逐个获取，因为这样很浪费。

---

## 任务创建与修改

### 6. 添加任务 (`add_task`)

- **MCP 工具:** `add_task`
- **CLI 命令:** `task-master add-task [options]`
- **描述:** `通过描述向 Taskmaster 添加一个新任务；AI 将对其进行结构化。`
- **主要参数/选项:**
  - `prompt`: `必需。描述您希望 Taskmaster 创建的新任务，例如，“使用 JWT 实现用户认证”。` (CLI: `-p, --prompt <text>`)
  - `dependencies`: `指定在此新任务开始前必须完成的任何 Taskmaster 任务的 ID，例如 '12,14'。` (CLI: `-d, --dependencies <ids>`)
  - `priority`: `为新任务设置优先级：'high'、'medium' 或 'low'。默认为 'medium'。` (CLI: `--priority <priority>`)
  - `research`: `启用 Taskmaster 的研究角色，以创建可能更明智的任务。` (CLI: `-r, --research`)
  - `tag`: `指定要向其添加任务的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 在开发过程中快速添加新识别的任务。
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。

### 7. 添加子任务 (`add_subtask`)

- **MCP 工具:** `add_subtask`
- **CLI 命令:** `task-master add-subtask [options]`
- **描述:** `向 Taskmaster 父任务添加一个新子任务，或将现有任务转换为子任务。`
- **主要参数/选项:**
  - `id` / `parent`: `必需。将作为父任务的 Taskmaster 任务的 ID。` (MCP: `id`, CLI: `-p, --parent <id>`)
  - `taskId`: `如果您想将现有的顶级 Taskmaster 任务转换为指定父任务的子任务，请使用此选项。` (CLI: `-i, --task-id <id>`)
  - `title`: `如果未使用 taskId，则为必需。Taskmaster 应创建的新子任务的标题。` (CLI: `-t, --title <title>`)
  - `description`: `新子任务的简短描述。` (CLI: `-d, --description <text>`)
  - `details`: `为新子任务提供实现说明或细节。` (CLI: `--details <text>`)
  - `dependencies`: `指定在此新子任务之前必须完成的其他任务或子任务的 ID，例如 '15' 或 '16.1'。` (CLI: `--dependencies <ids>`)
  - `status`: `为新子任务设置初始状态。默认为 'pending'。` (CLI: `-s, --status <status>`)
  - `skipGenerate`: `在添加子任务后，阻止 Taskmaster 自动重新生成 markdown 任务文件。` (CLI: `--skip-generate`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 手动分解任务或重组现有任务。

### 8. 更新任务 (`update`)

- **MCP 工具:** `update`
- **CLI 命令:** `task-master update [options]`
- **描述:** `根据新的上下文或更改，从特定任务 ID 开始，更新 Taskmaster 中的多个即将进行的任务。`
- **主要参数/选项:**
  - `from`: `必需。Taskmaster 应更新的第一个任务的 ID。所有具有此 ID 或更高 ID 且状态不为 'done' 的任务都将被考虑。` (CLI: `--from <id>`)
  - `prompt`: `必需。解释要应用于任务的更改或新上下文，例如，“我们现在使用 React Query 而不是 Redux Toolkit 进行数据获取”。` (CLI: `-p, --prompt <text>`)
  - `research`: `启用 Taskmaster 的研究角色以进行更明智的更新。需要相应的 API 密钥。` (CLI: `-r, --research`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 处理影响多个未来任务的重大实现更改或转向。示例 CLI: `task-master update --from='18' --prompt='切换到 React Query。\n需要重构数据获取...'`
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。

### 9. 更新任务 (`update_task`)

- **MCP 工具:** `update_task`
- **CLI 命令:** `task-master update-task [options]`
- **描述:** `按 ID 修改特定的 Taskmaster 任务，并入新的信息或更改。默认情况下，这将替换现有的任务细节。`
- **主要参数/选项:**
  - `id`: `必需。您要更新的特定 Taskmaster 任务的 ID，例如 '15'。` (CLI: `-i, --id <id>`)
  - `prompt`: `必需。解释 Taskmaster 应并入此任务的具体更改或提供新信息。` (CLI: `-p, --prompt <text>`)
  - `append`: `如果为 true，则将提示内容附加到任务的详细信息中，并带上时间戳，而不是替换它们。行为类似于 update-subtask。` (CLI: `--append`)
  - `research`: `启用 Taskmaster 的研究角色以进行更明智的更新。需要相应的 API 密钥。` (CLI: `-r, --research`)
  - `tag`: `指定任务所属的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 根据新的理解完善特定任务。使用 `--append` 记录进度，而无需创建子任务。
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。

### 10. 更新子任务 (`update_subtask`)

- **MCP 工具:** `update_subtask`
- **CLI 命令:** `task-master update-subtask [options]`
- **描述:** `向特定的 Taskmaster 子任务附加带时间戳的注释或详细信息，而不覆盖现有内容。旨在用于迭代实现日志记录。`
- **主要参数/选项:**
  - `id`: `必需。要使用新信息更新的 Taskmaster 子任务的 ID，例如 '5.2'。` (CLI: `-i, --id <id>`)
  - `prompt`: `必需。要附加到子任务详细信息中的信息、发现或进度说明，并带上时间戳。` (CLI: `-p, --prompt <text>`)
  - `research`: `启用 Taskmaster 的研究角色以进行更明智的更新。需要相应的 API 密钥。` (CLI: `-r, --research`)
  - `tag`: `指定子任务所属的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 在子任务开发过程中记录实现进度、发现和探索。每次更新都会带上时间戳并附加，以保留实现过程。
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。

### 11. 设置任务状态 (`set_task_status`)

- **MCP 工具:** `set_task_status`
- **CLI 命令:** `task-master set-status [options]`
- **描述:** `更新一个或多个 Taskmaster 任务或子任务的状态，例如 'pending'、'in-progress'、'done'。`
- **主要参数/选项:**
  - `id`: `必需。要更新的 Taskmaster 任务或子任务的 ID，例如 '15'、'15.2' 或 '16,17.1'。` (CLI: `-i, --id <id>`)
  - `status`: `必需。要设置的新状态，例如 'done'、'pending'、'in-progress'、'review'、'cancelled'。` (CLI: `-s, --status <status>`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 在任务通过开发周期时标记进度。

### 12. 移除任务 (`remove_task`)

- **MCP 工具:** `remove_task`
- **CLI 命令:** `task-master remove-task [options]`
- **描述:** `从 Taskmaster 任务列表中永久移除一个任务或子任务。`
- **主要参数/选项:**
  - `id`: `必需。要永久移除的 Taskmaster 任务（例如 '5'）或子任务（例如 '5.2'）的 ID。` (CLI: `-i, --id <id>`)
  - `yes`: `跳过确认提示并立即删除任务。` (CLI: `-y, --yes`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 永久删除项目中不再需要的任务或子任务。
- **注意:** 请谨慎使用，因为此操作无法撤销。如果您只想将任务从活动计划中排除但保留以供参考，请考虑使用 'blocked'、'cancelled' 或 'deferred' 状态。该命令会自动清理其他任务中的依赖关系引用。

---

## 任务结构与分解

### 13. 展开任务 (`expand_task`)

- **MCP 工具:** `expand_task`
- **CLI 命令:** `task-master expand [options]`
- **描述:** `使用 Taskmaster 的 AI 将一个复杂的任务分解成更小、可管理的子任务。默认情况下会附加子任务。`
- **主要参数/选项:**
  - `id`: `您想要分解成子任务的特定 Taskmaster 任务的 ID。` (CLI: `-i, --id <id>`)
  - `num`: `可选：建议 Taskmaster 应创建的子任务数量。否则使用复杂性分析/默认值。` (CLI: `-n, --num <number>`)
  - `research`: `启用 Taskmaster 的研究角色以生成更明智的子任务。需要相应的 API 密钥。` (CLI: `-r, --research`)
  - `prompt`: `可选：为 Taskmaster 生成子任务提供额外的上下文或特定说明。` (CLI: `-p, --prompt <text>`)
  - `force`: `可选：如果为 true，则在生成新子任务之前清除现有子任务。默认为 false（附加）。` (CLI: `--force`)
  - `tag`: `指定任务所属的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 在开始编码前为复杂任务生成详细的实施计划。如果可用且未指定 `num`，则自动使用复杂性报告建议。
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。

### 14. 展开所有任务 (`expand_all`)

- **MCP 工具:** `expand_all`
- **CLI 命令:** `task-master expand --all [options]` (注意：CLI 使用带 `--all` 标志的 `expand` 命令)
- **描述:** `让 Taskmaster 根据复杂性分析或默认值自动展开所有符合条件的待处理/进行中的任务。默认情况下会附加子任务。`
- **主要参数/选项:**
  - `num`: `可选：建议 Taskmaster 为每个任务创建的子任务数量。` (CLI: `-n, --num <number>`)
  - `research`: `启用研究角色以生成更明智的子任务。需要相应的 API 密钥。` (CLI: `-r, --research`)
  - `prompt`: `可选：提供额外的上下文，供 Taskmaster 在展开期间普遍应用。` (CLI: `-p, --prompt <text>`)
  - `force`: `可选：如果为 true，则在为每个符合条件的任务生成新子任务之前清除现有子任务。默认为 false（附加）。` (CLI: `--force`)
  - `tag`: `指定要展开的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 在初始任务生成或复杂性分析后，用于一次性分解多个任务。
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。

### 15. 清除子任务 (`clear_subtasks`)

- **MCP 工具:** `clear_subtasks`
- **CLI 命令:** `task-master clear-subtasks [options]`
- **描述:** `从一个或多个指定的 Taskmaster 父任务中移除所有子任务。`
- **主要参数/选项:**
  - `id`: `您要移除其子任务的 Taskmaster 父任务的 ID，例如 '15' 或 '16,18'。除非使用 'all'，否则为必需。` (CLI: `-i, --id <ids>`)
  - `all`: `让 Taskmaster 从所有父任务中移除子任务。` (CLI: `--all`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 如果之前的分解需要替换，则在用 `expand_task` 重新生成子任务之前使用。

### 16. 移除子任务 (`remove_subtask`)

- **MCP 工具:** `remove_subtask`
- **CLI 命令:** `task-master remove-subtask [options]`
- **描述:** `从其 Taskmaster 父任务中移除一个子任务，可选择将其转换为独立任务。`
- **主要参数/选项:**
  - `id`: `必需。要移除的 Taskmaster 子任务的 ID，例如 '15.2' 或 '16.1,16.3'。` (CLI: `-i, --id <id>`)
  - `convert`: `如果使用，Taskmaster 会将子任务转换为常规的顶级任务，而不是删除它。` (CLI: `-c, --convert`)
  - `skipGenerate`: `在移除子任务后，阻止 Taskmaster 自动重新生成 markdown 任务文件。` (CLI: `--skip-generate`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 删除不必要的子任务或将子任务提升为顶级任务。

### 17. 移动任务 (`move_task`)

- **MCP 工具:** `move_task`
- **CLI 命令:** `task-master move [options]`
- **描述:** `将任务或子任务移动到任务层次结构中的新位置。`
- **主要参数/选项:**
  - `from`: `必需。要移动的任务/子任务的 ID（例如 "5" 或 "5.2"）。可以是逗号分隔的多个任务。` (CLI: `--from <id>`)
  - `to`: `必需。目标的 ID（例如 "7" 或 "7.3"）。如果源 ID 是逗号分隔的，则必须匹配源 ID 的数量。` (CLI: `--to <id>`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 通过在层次结构中移动任务来重新组织任务。支持各种场景，例如：
  - 将任务移动为子任务
  - 将子任务移动为独立任务
  - 将子任务移动到不同的父任务下
  - 在同一父任务内重新排序子任务
  - 将任务移动到新的、不存在的 ID（自动创建占位符）
  - 使用逗号分隔的 ID 一次移动多个任务
- **验证功能:**
  - 允许将任务移动到不存在的目标 ID（创建占位符任务）
  - 防止移动到已有内容的现有任务 ID（以避免覆盖）
  - 在尝试移动之前验证源任务是否存在
  - 保持正确的父子关系
- **示例 CLI:** `task-master move --from=5.2 --to=7.3` 将子任务 5.2 移动为子任务 7.3。
- **多重移动示例:** `task-master move --from=10,11,12 --to=16,17,18` 将多个任务移动到新位置。
- **常见用途:** 解决当多个团队成员在不同分支上创建任务时，tasks.json 中出现的合并冲突。

---

## 依赖管理

### 18. 添加依赖 (`add_dependency`)

- **MCP 工具:** `add_dependency`
- **CLI 命令:** `task-master add-dependency [options]`
- **描述:** `在 Taskmaster 中定义一个依赖关系，使一个任务成为另一个任务的先决条件。`
- **主要参数/选项:**
  - `id`: `必需。将依赖于另一个任务的 Taskmaster 任务的 ID。` (CLI: `-i, --id <id>`)
  - `dependsOn`: `必需。必须首先完成的 Taskmaster 任务的 ID，即先决条件。` (CLI: `-d, --depends-on <id>`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <path>`)
- **用法:** 在任务之间建立正确的执行顺序。

### 19. 移除依赖 (`remove_dependency`)

- **MCP 工具:** `remove_dependency`
- **CLI 命令:** `task-master remove-dependency [options]`
- **描述:** `移除两个 Taskmaster 任务之间的依赖关系。`
- **主要参数/选项:**
  - `id`: `必需。您要从中移除先决条件的 Taskmaster 任务的 ID。` (CLI: `-i, --id <id>`)
  - `dependsOn`: `必需。不应再作为先决条件的 Taskmaster 任务的 ID。` (CLI: `-d, --depends-on <id>`)
  - `tag`: `指定要操作的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 当执行顺序发生变化时更新任务关系。

### 20. 验证依赖 (`validate_dependencies`)

- **MCP 工具:** `validate_dependencies`
- **CLI 命令:** `task-master validate-dependencies [options]`
- **描述:** `检查您的 Taskmaster 任务是否存在依赖问题（如循环引用或链接到不存在的任务），而不做任何更改。`
- **主要参数/选项:**
  - `tag`: `指定要验证的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 审计任务依赖的完整性。

### 21. 修复依赖 (`fix_dependencies`)

- **MCP 工具:** `fix_dependencies`
- **CLI 命令:** `task-master fix-dependencies [options]`
- **描述:** `自动修复您的 Taskmaster 任务中的依赖问题（如循环引用或链接到不存在的任务）。`
- **主要参数/选项:**
  - `tag`: `指定要修复依赖的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 自动清理依赖错误。

---

## 分析与报告

### 22. 分析项目复杂度 (`analyze_project_complexity`)

- **MCP 工具:** `analyze_project_complexity`
- **CLI 命令:** `task-master analyze-complexity [options]`
- **描述:** `让 Taskmaster 分析您的任务以确定其复杂性，并建议哪些任务需要进一步分解。`
- **主要参数/选项:**
  - `output`: `保存复杂性分析报告的位置。默认为 '.taskmaster/reports/task-complexity-report.json'（如果使用标签，则为 '..._tagname.json'）。` (CLI: `-o, --output <file>`)
  - `threshold`: `应触发扩展任务建议的最低复杂性得分（1-10）。` (CLI: `-t, --threshold <number>`)
  - `research`: `启用研究角色以进行更准确的复杂性分析。需要相应的 API 密钥。` (CLI: `-r, --research`)
  - `tag`: `指定要分析的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 在分解任务之前使用，以确定哪些任务最需要关注。
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。请通知用户在操作进行中耐心等待。

### 23. 查看复杂度报告 (`complexity_report`)

- **MCP 工具:** `complexity_report`
- **CLI 命令:** `task-master complexity-report [options]`
- **描述:** `以可读格式显示任务复杂性分析报告。`
- **主要参数/选项:**
  - `tag`: `指定要显示报告的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `复杂性报告的路径（默认为 '.taskmaster/reports/task-complexity-report.json'）。` (CLI: `-f, --file <file>`)
- **用法:** 在运行 analyze-complexity 后，审查和理解复杂性分析结果。

---

## 文件管理

### 24. 生成任务文件 (`generate`)

- **MCP 工具:** `generate`
- **CLI 命令:** `task-master generate [options]`
- **描述:** `根据您的 tasks.json 创建或更新每个任务的单独 Markdown 文件。`
- **主要参数/选项:**
  - `output`: `Taskmaster 应保存任务文件的目录（默认为 'tasks' 目录）。` (CLI: `-o, --output <directory>`)
  - `tag`: `指定要为其生成文件的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
- **用法:** 在对 tasks.json 进行更改后运行此命令，以保持单个任务文件的最新状态。此命令现在是手动的，不再自动运行。

---

## AI 驱动的研究

### 25. 研究 (`research`)

- **MCP 工具:** `research`
- **CLI 命令:** `task-master research [options]`
- **描述:** `使用项目上下文执行 AI 驱动的研究查询，以获取超出 AI 知识截止日期的最新信息。`
- **主要参数/选项:**
  - `query`: `必需。研究查询/提示（例如，“React Query v5 的最新最佳实践是什么？”）。` (CLI: `[query]` 位置参数或 `-q, --query <text>`)
  - `taskIds`: `当前标签上下文中的任务/子任务 ID 的逗号分隔列表（例如，“15,16.2,17”）。` (CLI: `-i, --id <ids>`)
  - `filePaths`: `用于上下文的文件路径的逗号分隔列表（例如，“src/api.js,docs/readme.md”）。` (CLI: `-f, --files <paths>`)
  - `customContext`: `要在研究中包含的附加自定义上下文文本。` (CLI: `-c, --context <text>`)
  - `includeProjectTree`: `在上下文中包含项目文件树结构（默认为 false）。` (CLI: `--tree`)
  - `detailLevel`: `研究响应的详细级别：'low'、'medium'、'high'（默认为 medium）。` (CLI: `--detail <level>`)
  - `saveTo`: `要自动保存研究对话的任务或子任务 ID（例如，“15”或“15.2”）。` (CLI: `--save-to <id>`)
  - `saveFile`: `如果为 true，则将研究对话保存到 '.taskmaster/docs/research/' 目录中的 markdown 文件。` (CLI: `--save-file`)
  - `noFollowup`: `在 CLI 中禁用交互式跟进问题菜单。` (CLI: `--no-followup`)
  - `tag`: `指定用于基于任务的上下文收集的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)
  - `projectRoot`: `项目的目录。必须是绝对路径。` (CLI: 自动确定)
- **用法:** **这是一个功能强大的工具，代理应频繁使用** 以：
  - 获取超出知识截止日期的最新信息
  - 研究最新的最佳实践、库更新、安全补丁
  - 查找特定技术的实现示例
  - 根据当前行业标准验证方法
  - 根据项目文件和任务获取上下文建议
- **何时考虑使用研究:**
  - **在实施任何任务之前** - 研究当前的最佳实践
  - **遇到新技术时** - 获取最新的实施指南（库、API 等）
  - **对于与安全相关的任务** - 查找最新的安全建议
  - **更新依赖项时** - 研究重大更改和迁移指南
  - **对于性能优化** - 获取当前的性能最佳实践
  - **调试复杂问题时** - 研究已知的解决方案和变通方法
- **研究 + 行动模式:**
  - 使用 `research` 收集最新信息
  - 使用 `update_subtask` 提交带时间戳的发现
  - 使用 `update_task` 将研究并入任务细节
  - 使用带研究标志的 `add_task` 进行明智的任务创建
- **重要提示:** 此 MCP 工具会进行 AI 调用，最多可能需要一分钟才能完成。研究提供了超出 AI 训练截止日期的最新数据，使其对于当前的最佳实践和最新发展非常有价值。

---

## 标签管理

这个新的命令套件允许您管理不同的任务上下文（标签）。

### 26. 列出标签 (`tags`)

- **MCP 工具:** `list_tags`
- **CLI 命令:** `task-master tags [options]`
- **描述:** `列出所有可用的标签，包括任务计数、完成状态和其他元数据。`
- **主要参数/选项:**
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)
  - `--show-metadata`: `在输出中包含详细的元数据（例如，创建日期、描述）。` (CLI: `--show-metadata`)

### 27. 添加标签 (`add_tag`)

- **MCP 工具:** `add_tag`
- **CLI 命令:** `task-master add-tag <tagName> [options]`
- **描述:** `创建一个新的空标签上下文，或从另一个标签复制任务。`
- **主要参数/选项:**
  - `tagName`: `要创建的新标签的名称（字母数字、连字符、下划线）。` (CLI: `<tagName>` 位置参数)
  - `--from-branch`: `根据当前 git 分支创建一个标签名称，忽略 <tagName> 参数。` (CLI: `--from-branch`)
  - `--copy-from-current`: `将任务从当前活动的标签复制到新标签。` (CLI: `--copy-from-current`)
  - `--copy-from <tag>`: `将任务从特定的源标签复制到新标签。` (CLI: `--copy-from <tag>`)
  - `--description <text>`: `为新标签提供可选描述。` (CLI: `-d, --description <text>`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)

### 28. 删除标签 (`delete_tag`)

- **MCP 工具:** `delete_tag`
- **CLI 命令:** `task-master delete-tag <tagName> [options]`
- **描述:** `永久删除一个标签及其所有相关任务。`
- **主要参数/选项:**
  - `tagName`: `要删除的标签的名称。` (CLI: `<tagName>` 位置参数)
  - `--yes`: `跳过确认提示。` (CLI: `-y, --yes`)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)

### 29. 使用标签 (`use_tag`)

- **MCP 工具:** `use_tag`
- **CLI 命令:** `task-master use-tag <tagName>`
- **描述:** `将您的活动任务上下文切换到不同的标签。`
- **主要参数/选项:**
  - `tagName`: `要切换到的标签的名称。` (CLI: `<tagName>` 位置参数)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)

### 30. 重命名标签 (`rename_tag`)

- **MCP 工具:** `rename_tag`
- **CLI 命令:** `task-master rename-tag <oldName> <newName>`
- **描述:** `重命名一个现有标签。`
- **主要参数/选项:**
  - `oldName`: `标签的当前名称。` (CLI: `<oldName>` 位置参数)
  - `newName`: `标签的新名称。` (CLI: `<newName>` 位置参数)
  - `file`: `您的 Taskmaster 'tasks.json' 文件的路径。默认依赖于自动检测。` (CLI: `-f, --file <file>`)

### 31. 复制标签 (`copy_tag`)

- **MCP 工具:** `copy_tag`
- **CLI 命令:** `task-master copy-tag <sourceName> <targetName> [options]`
- **描述:** `将整个标签上下文（包括其所有任务和元数据）复制到一个新标签。`
- **主要参数/选项:**
  - `sourceName`: `要从中复制的源标签的名称。` (CLI: `<sourceName>` 位置参数)
  - `targetName`: `要创建的新标签的名称。` (CLI: `<targetName>` 位置参数)
  - `description`: `新标签的可选描述。` (CLI: `-d, --description <text>`)

---

## 其他

### 32. 同步 Readme (`sync-readme`) -- 实验性

- **MCP 工具:** N/A
- **CLI 命令:** `task-master sync-readme [options]`
- **描述:** `将您的任务列表导出到项目的 README.md 文件，用于展示进度。`
- **主要参数/选项:**
  - `status`: `按状态过滤任务（例如 'pending', 'done'）。` (CLI: `-s, --status <status>`)
  - `withSubtasks`: `在导出中包含子任务。` (CLI: `--with-subtasks`)
  - `tag`: `指定要从中导出的标签上下文。默认为当前活动的标签。` (CLI: `--tag <name>`)

---

## 环境变量配置（更新）

Taskmaster 主要使用项目根目录中的 **`.taskmaster/config.json`** 文件进行配置（模型、参数、日志级别等），通过 `task-master models --setup` 进行管理。

环境变量**仅**用于与 AI 提供商相关的敏感 API 密钥和特定覆盖（如 Ollama 基础 URL）：

- **API 密钥（相应提供商必需）：**
  - `ANTHROPIC_API_KEY`
  - `PERPLEXITY_API_KEY`
  - `OPENAI_API_KEY`
  - `GOOGLE_API_KEY`
  - `MISTRAL_API_KEY`
  - `AZURE_OPENAI_API_KEY` (也需要 `AZURE_OPENAI_ENDPOINT`)
  - `OPENROUTER_API_KEY`
  - `XAI_API_KEY`
  - `OLLAMA_API_KEY` (也需要 `OLLAMA_BASE_URL`)
- **端点（可选/提供商特定，在 .taskmaster/config.json 内部）：**
  - `AZURE_OPENAI_ENDPOINT`
  - `OLLAMA_BASE_URL` (默认: `http://localhost:11434/api`)

在您的项目根目录的 **`.env`** 文件中**设置 API 密钥**（用于 CLI 使用），或在您的 **`.cursor/mcp.json`** 文件的 `env` 部分中设置（用于 MCP/Cursor 集成）。所有其他设置（模型选择、最大令牌数、温度、日志级别、自定义端点）都在 `.taskmaster/config.json` 中通过 `task-master models` 命令或 `models` MCP 工具进行管理。

---

有关这些命令如何融入开发过程的详细信息，请参阅 [dev_workflow.mdc](mdc:.cursor/rules/taskmaster/dev_workflow.mdc)。
