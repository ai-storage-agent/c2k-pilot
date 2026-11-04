# 04 · 代码地图与工程质量

> 依据固定提交 `8c32a9d` 的 `git ls-files`、`wc -l`、`package.json`、`tsdown.config.ts`、`vitest.config.ts`、`cordis.patch.yml`、`docs/007-architecture.md` 与测试文件整理。行数为物理行数，包含注释和空行。

## 1. 规模

| 区域 | 文件数 | 行数 | 说明 |
| --- | --- | ---: | --- |
| `src/` | 111 | 15,587 | 运行时源码 |
| ├ `src/core/` | 15 | 2,088 | 领域模型、Engine、部件、端口、错误、理由 |
| ├ `src/app/` | 38 | 5,292 | 组合根、存储、设置、提示词、Session、效果、HTTP、视图、工具 |
| ├ `src/sources/` | 16 | 2,059 | Source 协议与 GitHub/Feishu |
| ├ `src/executor/` | 2 | 838 | DSH Executor 与后台工作 |
| ├ `src/client/` | 27 | 4,419 | React 面板 |
| ├ `src/infra/` | 5 | 347 | CLI、环境、健康、文本、路径 |
| └ `src/` 根文件 | 8 | 544 | 插件入口、部署、策略、KV、limits、navigation、setup |
| `tests/` | 65 | 14,960 | 59 个 spec + 6 个 fixture |
| `docs/` | 9 | 1,973 | 000–008 编号文档 |
| `prompts/` | 15 | 438 | 角色、工作、handoff、团队段 |
| `skills/` | 2 | 26 | GitHub / Feishu 技能 |
| 其他（README、SETUP、配置、脚本、locale） | 14 | 4,127 | 其中 `pnpm-lock.yaml` 3,344；README 39、SETUP 79、service 脚本 250、cordis patch 193 等 |
| **合计（受版本控制）** | **216** | **37,111** | 含 `pnpm-lock.yaml` 等 |

测试规模：**59 个 spec 文件、1,197 个用例**（`vitest list`），约 1.5 万行测试代码，测试/源码行数比约 0.96:1。测试最多的文件：

| 测试文件 | 用例 | 覆盖 |
| --- | ---: | --- |
| `tests/core-engine.spec.ts` | 113 | 领域规则：接收、Eval、扇出、恢复/停止、中断、暂停、策略变更、报告、附着、回复、投递失败 |
| `tests/runtime.spec.ts` | 91 | 在模拟 DSH 宿主上跑完整 runtime，通过工具和 HTTP |
| `tests/sources.spec.ts` | 71 | Feishu/GitHub Source 的翻译、轮询、读取位置、PR 规则、健康 |
| `tests/runtime-concurrency.spec.ts` | 56 | 重叠工作：pass 期间来 Trigger、投递/启动期间 Ticket 变化 |
| `tests/policy.spec.ts` | 41 | Source scope、gate、准入表、Mandate 校验、Policy 版本、设置迁移、评估结果 |
| `tests/tools.spec.ts` | 26 | 两个角色的工具与 `orchestrator_read` 资源 |

## 2. 目录结构

```text
dsh-superagent-prototype/
├── README.md                 项目说明、定位、文档索引
├── SETUP.md                  给 agent 的逐步部署流程（询问操作员、计划、执行、验证）
├── LICENSE                   MIT
├── package.json              DSH bundle 元数据、依赖、scripts
├── cordis.patch.yml          bundle 层：插入 3 个插件 + 2 个 agent preset
├── tsdown.config.ts          构建：Node ESM 入口 + 浏览器 CJS client
├── vitest.config.ts          测试：tests/**/*.spec.{ts,tsx}，React dedupe
├── examples/profile.cordis.patch.yml
├── scripts/dsh-superagent    Python 服务管理脚本（tmux、状态、退出码）
├── docs/                     000–008 编号设计/运维文档
├── locale/                   DSH 插件元数据的中英文
├── prompts/                  角色与工作提示词 + team/ 三个团队段
├── skills/                   内置 GitHub/Feishu 技能
├── src/                      运行时源码（见上表）
└── tests/                    测试与 fixture
```

## 3. 关键模块

### 3.1 领域核心 `src/core/`

| 模块 | 行数 | 职责 |
| --- | ---: | --- |
| `engine.ts` | 270 | 唯一事务入口；委托五个部件；角色接口 |
| `model.ts` | 353 | 领域类型、不变量、共享谓词（`followupOwners`、`settled`、`waitsForPerson` 等） |
| `ports.ts` | 134 | `Repositories`、`Policy`、`SourceScope`、`Assessor`、`Executor`、`Outbox`、领域事件 |
| `tickets.ts` | 423 | Ticket 生命周期、Mandate、订阅、Input、恢复/停止/结束 |
| `evals.ts` | 340 | Eval 批次、gate、deadline、候选、Decision |
| `intake.ts` | 63 | Trigger 入库、去重、扇出、排队 |
| `assignments.ts` | 140 | Assignment 事实与 worker Report |
| `replies.ts` | 95 | 确认/回答/结果/attention 的写入规则 |
| `stage.ts` | — | 工单阶段与 `canRetry` |
| `reasons.ts` | — | 结构化理由 code 与英文文本 |
| `errors.ts` | — | `UserError` 与固定拒绝 |
| `memory.ts` | — | 内存仓库，供领域测试使用 |

核心不导入外部（除 Node 哈希），不做 I/O；所有时间、事务、外部工作通过依赖注入。

### 3.2 应用层 `src/app/`

| 模块 | 行数 | 职责 |
| --- | ---: | --- |
| `runtime.ts` | 254 | 组合根、启动/关闭、目录锁、健康板、路由与 SourceHost |
| `store.ts` | 291 | SQLite schema 11、仓库接口、事务、迁移入口、生成列 |
| `effects.ts` | 161 | 持久化副作用队列、并发/重试/保序/健康 |
| `outbox.ts` | 52 | Outbox 端口与回执；发送逻辑主要在 Store 回执 + `reply` effect |
| `settings.ts` | 267 | 版本化设置块、保存 origin、Policy 变更、同步 |
| `prompts.ts` | 247 | 提示词版本、覆盖、组装、默认变更检测 |
| `sessions.ts` | 352 | 两个角色的 Session、提示词/技能/工具注册、noWait 守卫 |
| `assessment.ts` | 282 | MasterAssessor、评估 schema、有界上下文 |
| `notices.ts` | 129 | 领域事件/报告/跟进到主 Session 的消息 |
| `http.ts` | 247 | 管理 API 路由、同源/loopback 检查、错误码 |
| `api.ts` | 52 | 所有路由的类型契约（只导入类型，供面板复用） |
| `migration.ts` | 616 | schema 10 → 11 的一次性迁移 |
| `views/` | — | 面板各页的只读视图 |
| `tools/` | — | 两个角色的工具适配、`orchestrator_read` |
| `store-read.ts` | 81 | 供视图/工具/Source 轮询的只读查询 |
| `versions.ts` | — | 编号快照 + 当前指针（设置、提示词） |
| `settings-history.ts` | 91 | 每次设置修订及其变化的 diff |

### 3.3 Source `src/sources/`

| 模块 | 行数 | 职责 |
| --- | ---: | --- |
| `kind.ts` | 115 | `SourceKind` 协议：配置、字段、scope、channel、context、policy、environment |
| `registry.ts` | 138 | 注册表、实例、校验、Policy 部分、Channel、Thread context |
| `host.ts` | — | `SourceHost`/`SourceContext`、健康类型与固定文本 |
| `poll.ts` | — | 时间游标、两周窗口、逐 Thread 轮询与 `pollError` |
| `github.ts` | 459 | GitHub kind、通知/PR/CI/Thread 轮询、插件入口 |
| `github-trigger.ts` | 108 | 评论/review/Issue body/CI → Trigger |
| `github-pull.ts` | 105 | PR 跟随、关闭、结束通知 |
| `github-read.ts` | 177 | CI 快照、仓库读取、`github/` 资源、Thread context |
| `github-channel.ts` | — | Issue 评论与 review thread 回复 |
| `feishu.ts` | 139 | Feishu kind、插件入口、scope/channel/policy |
| `feishu-trigger.ts` | 89 | 消息 → Trigger（实时/历史/话题共用规则） |
| `feishu-loops.ts` | 267 | 事件消费、历史补收、群名、话题轮询 |
| `feishu-read.ts` | 171 | `feishu/` 资源、Thread context、图片 |
| `feishu-channel.ts` | — | 话题回复 |
| `feishu-image.ts` | — | 消息图片作为 attachment |
| `admission-context.ts` | — | 评估的初始窗口（前 5 条 + 两侧 5 条） |

### 3.4 执行器与基础设施

| 模块 | 行数 | 职责 |
| --- | ---: | --- |
| `executor/dsh.ts` | 673 | Session/目录、prepare、worker slot、Input 投递、Report、retry/restart |
| `executor/background.ts` | 165 | shell job 与 subagent 的等待、收集、停止 |
| `infra/commands.ts` | — | CLI 传输：`run`、`api`/`pages`（限定仓库）、`lark`、`git`、错误码 |
| `infra/environment.ts` | — | shim、git 配置、`runAsWorker`、目录检查 |
| `infra/health.ts` | — | HealthBoard，一个条目一个认领者 |
| `infra/text.ts` | — | 词数、消息上限、`fill`、`sameName` |
| `infra/paths.ts` | — | 包根与打包文件路径 |

### 3.5 面板 `src/client/`

| 模块 | 职责 |
| --- | --- |
| `index.tsx` | 注册侧边栏图标、主面板、Plugin Manager 配置页 |
| `app.tsx` | 面板外壳：header、搜索、术语表、标签、当前路由 |
| `provider.tsx` | 每个页面共享的宿主读取、轮询、重启 |
| `api.ts` | 管理 API 调用与轮询，类型来自 `app/api.ts` |
| `route.ts` | 标签、设置组、类型化路由、路由记忆 |
| `overview.tsx` / `source.tsx` / `trigger.tsx` / `eval.tsx` / `execution.tsx` | 每个阶段一页 |
| `thread.tsx` / `ticket.tsx` | Thread 时间线与 Ticket 详情 |
| `settings.tsx` / `settings-kit.tsx` / `draft.tsx` / `prompts.tsx` / `prompt-config.ts` | 设置表单、草稿、保存条、提示词编辑/历史/diff |
| `controls.tsx` / `widgets.tsx` / `rows.tsx` / `markdown.ts` / `marks.ts` / `text.ts` / `locales.ts` / `client.css` | 本地控件、共享组件、行、Markdown、状态标记、文案、样式 |
| `locales.ts` | 770 行，中英文全部文案 + 领域术语表 |

面板不导入 `@deepseek-ai/dsh-client-ui-primitives`，因此本地复制了需要的控件，但遵循 DSH 的 markup、键盘行为和设计 token。

## 4. 测试地图

测试按职责大致分为：

| 组 | 文件（示例） | 覆盖 |
| --- | --- | --- |
| 领域规则 | `core-engine`、`stage`、`policy`、`followups`、`queue` | Trigger 生命周期、gate、Mandate、订阅、阶段、attaching、回复 |
| 运行时 | `runtime`、`runtime-concurrency`、`passes`、`effects`、`outbox`、`health` | 完整应用、并发、pass 调度、效果队列、回执、健康 |
| Source | `sources`、`registry`、`commands`、`feishu-read`、`github-read`、`admission-context`、`feishu-image` | 翻译、轮询、游标、scope、Channel、上下文、图片 |
| 评估 | `assessment`、`admission-context` | MasterAssessor 的缓存、释放、上下文窗口 |
| 执行器 | `background`、`delivery`、`retry-health`、`role-models` | 后台工作、投递、模型预算重试、角色模型 |
| 持久化 | `store`、`migration`、`timeline`、`views` | 仓库、schema 11 迁移、时间线分页、视图派生 |
| 设置与提示词 | `settings`、`prompts`、`prompt-config`、`draft` | 保存冲突、Policy 变更、提示词校验/组装/版本、草稿合并 |
| 面板 | `panel-*.spec.tsx`、`client`、`navigation`、`controls`、`marks`、`markdown`、`styles` | 每个页面、路由、控件、状态标记、Markdown、样式 |
| 元测试 | `docs`、`class-docs`、`model-surface`、`locales`、`bundle-patch`、`service-script`、`index`、`deployment`、`environment` | 文档/模块表完整性、JSDoc、模型可见表面、双语、bundle、服务脚本、插件入口、部署、环境 |

### 元测试：把架构规则变成 CI 门禁

这是该仓库最值得借鉴的工程实践之一：

- `tests/docs.spec.ts`
  - 编号文档必须从 000 连续；
  - 编号文档只能链接到更早的编号文档；
  - 所有本地链接必须能解析；
  - 文档不得含 merge conflict 标记；
  - `007` 的 Modules 表必须列出 `src` 下每个文件，且只列存在的文件；
  - `007` 的 Tests 表必须列出每个 `.spec` 文件，且只列存在的文件。
- `tests/class-docs.spec.ts`：`src` 里每个 class 声明前必须有 JSDoc。
- `tests/model-surface.spec.ts`：模型能读到的工具、提示词、技能和输入，必须与工具 schema、执行环境、术语表一致，并按角色检查大小预算。
- `tests/locales.spec.ts`：中英文文案完整。
- `tests/styles.spec.ts`：样式表。
- `tests/client.spec.tsx`：客户端导入无环。
- `tests/cards.spec.ts`：内置文本必须逐文件声明规则。
- `tests/bundle-patch.spec.ts`：bundle patch 按 DSH 的方式解析，并检查 Executor preset。
- `tests/service-script.spec.ts`：用假的 `ps`、`tmux`、`dsh` 测服务脚本。

这些测试把“文档说自己是架构的一部分”变成了可执行的约束，而不是口头约定。

## 5. 构建与运行

### package scripts

```json
{
  "build": "tsdown",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "check": "pnpm typecheck && pnpm test && pnpm build"
}
```

### 构建产物

`tsdown.config.ts` 定义两个构建：

1. **Node ESM**：入口 `src/index.ts`、`src/sources/github.ts`、`src/sources/feishu.ts`，输出 `lib/index.js`、`lib/github-watch.js`、`lib/feishu-watch.js`，带 `.d.ts`，`deps.neverBundle` 排除所有 `@deepseek-ai/*`、`zod`、`proper-lockfile`；
2. **浏览器 CJS**：入口 `src/client/index.tsx`，输出 `lib/client.js`，用自定义 banner/footer 包装成 DSH 的 `window.__ModuleLoader__.load({ id: "dsh-superagent", factory: ... })`；`?raw` 插件把 CSS 作为文本导入；排除 React/react-dom。

### DSH bundle patch

`cordis.patch.yml` 做三件事：

- 插入三个插件：`dsh-superagent`、`dsh-superagent/github-watch`、`dsh-superagent/feishu-watch`（Feishu 默认 disabled）；
- 定义 `dsh-superagent-worker` preset：DSH `standard` 的裁剪版，shell 5 秒转后台，含文件/搜索/工具/job/skill/compaction/subagent/todo/web，去掉提问、展示、plan、插件市场、调度、goal、workflow、web fetch、forked subagent；
- 定义 `dsh-superagent-router` preset：更小，shell 5 秒转后台，文件只读（`write: false, edit: false`），无 subagent/web/文件搜索/todo/提问/展示/plan/插件管理/调度/goal/workflow，没有 persona（主 Session 提示词是完整的）。

### 配置与依赖

- `dsh.bundle.patch` 指向 `./cordis.patch.yml`；
- `dsh.client.platform = web`，注入 6 个 DSH client 包；
- 运行时 `engines`：Node `^22.19.0 || >=24.0.0`，DSH `^0.2.1-alpha.2`；
- 包版本 `0.1.0`，`private: true`，不发布 npm；
- 依赖只有 `zod`、`proper-lockfile`；DSH 相关全部是 peer/dev 依赖。

## 6. 文档体系

| 文档 | 行数 | 内容 |
| --- | ---: | --- |
| `README.md` | 52 | 定位、setup、文档索引、开发、许可证 |
| `SETUP.md` | 64 | 给 agent 的部署流程：probe、逐题询问、计划、执行、验证 |
| `000-philosophy.md` | 33 | 注意力原则、对 agent/设计/责任的要求 |
| `001-domain.md` | 112 | 领域模型、概念表、被拒绝的概念、术语表 |
| `002-authorization.md` | 155 | 两条入口、强度、准入表、Policy 版本、恢复/停止 |
| `003-execution.md` | 203 | 阶段、Executor、后台工作、并发、失败/恢复、PR、合并 |
| `004-prompts.md` | 96 | 团队可编辑内容、内置部分、组装顺序、优先级、版本 |
| `005-panel.md` | 58 | 三个问题、标签、设置组、搜索、原则 |
| `006-deployment.md` | 274 | 账号、安装、机器配置、启停、设置、管理 API、setup 检查、升级、troubleshooting |
| `007-architecture.md` | 617 | Runtime/Engine/Store/Effects/Sources/Executor/Assessor/Sessions/Glue/模块表/测试表/持久化/模型接口 |
| `008-cookbook.md` | 425 | 从零新增一个 Source 的完整教程与测试示例 |

文档规则不是形式主义：`docs.spec.ts` 会检查编号连续、只向后链接、链接可解析、模块/测试表完整。这让文档在重构中不容易腐烂。

## 7. 版本、迁移与升级

- `SCHEMA_VERSION = 11`，`OLDEST_SCHEMA = 10`；
- 打开比当前新的数据库 → 拒绝启动；打开旧于 10 的 → 拒绝；
- 10 → 11 在启动时一次性迁移；迁移里写入了旧版本为主 Session 保存的数据；
- 数据库被新版本迁移后，旧版本无法打开；回滚必须先恢复升级前备份；
- 升级步骤：等 Executor 空闲 → 备份 `orchestrator.sqlite` → `git pull && pnpm install && pnpm build` → `scripts/dsh-superagent restart` 并检查状态；
- 团队提示词文本和覆盖会保留；没有覆盖的部分跟随新默认；面板标记“Default updated”；
- 升级 DSH 本身后要重启运行实例，否则面板加载的 artifacts 不匹配。

## 8. 扩展点

| 想扩展 | 改哪里 | 是否有指南 |
| --- | --- | --- |
| 新增 Source（webhook、GitLab、Jira…） | 实现 `SourceKind`，加 `tsdown` 入口、`package.json` exports、`cordis.patch.yml` insert、Policy/环境变量、测试 | `docs/008-cookbook.md` 有 11 步完整教程 |
| 新增主动规则 | Policy 的 `rules`（面板或设置块），提示词里写 instruction | 有默认 copy/visual 两条规则示例 |
| 改沟通/范围/交付规则 | 三个团队段 + 覆盖内置部分 | `docs/004-prompts.md` |
| 改面板 | `src/client/`，类型来自 `src/app/api.ts` | 无专门文档，代码与测试即规范 |
| 改执行环境 | Execution 设置、`prepare`、`blockedCommands`、Source 的 `environment` | `docs/003-execution.md` / `006-deployment.md` |
| 新增工具 | `src/app/tools/`，注册到角色；同步更新 `model-surface` 测试 | 007 的 Model-facing interfaces |

## 9. 代码阅读建议

1. `src/core/model.ts` → 先建立类型直觉；
2. `src/core/ports.ts` → 看领域需要外部提供什么；
3. `src/core/engine.ts` → 看唯一入口和五个部件；
4. `src/core/evals.ts` + `tickets.ts` → 授权、批次、生命周期；
5. `src/policy.ts` → gate、准入、Mandate 校验；
6. `src/app/runtime.ts` → 组合与启动；
7. `src/app/store.ts` + `effects.ts` + `outbox.ts` → 持久化与可靠副作用；
8. `src/executor/dsh.ts` → 一工单一 Session/目录；
9. `src/sources/kind.ts` + 一个具体 Source（建议 GitHub）→ 插件协议；
10. `src/app/sessions.ts` + `prompts.ts` + `prompts/` → 两个角色的提示词与工具；
11. `src/client/` → 面板；
12. `tests/core-engine.spec.ts` + `tests/runtime.spec.ts` → 看规则如何被验证。
