# dsh-superagent-prototype 研究归档

本目录是对 [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) 的研究归档：在固定提交上阅读其文档、提示词、源码与测试，记录它的设计、实现、边界和风险，并留下可复现的核验方式。归档日期为 **2026-11-04**。

> 上游是研究原型，README 明确写着 “Research prototype for reference only, not an official DeepSeek product”。本归档同样是研究材料，不构成对上游的生产可用性、安全性或正确性的背书。

## 1. 归档对象

| 项目 | 值 |
| --- | --- |
| 仓库 | `https://github.com/deepseek-ai/dsh-superagent-prototype` |
| 描述 | Towards a More Autonomous Agent System |
| 默认分支 | `main` |
| 固定提交 | `8c32a9dc5d72c033816c6a8110b37f40cf94fba4` |
| 提交信息 | `feat: add the dsh-superagent research prototype` |
| 提交时间 | 2026-10-31T20:05:39+08:00（2026-10-31T12:05:39Z） |
| 提交者 | DeepSeek Harness Team `<team@dsh.dev>` |
| 许可证 | MIT（Copyright (c) 2026 DeepSeek Harness Team） |
| 可见性 | public |
| 历史 | 1 个提交，无 tag，无 release |
| 归档时社会指标 | 17,412 stars、1,887 forks、114 watchers（2026-11-04T05:47Z 查询） |
| 仓库体积 | 本机 `.git` 打包约 783 KiB；`git archive HEAD` 约 2.7 MB |

### 为什么是“知识归档”而不是 GitHub Archive

`ai-storage-agent` 账号对该仓库只有只读权限（`admin=false`、`push=false`），无法调用 GitHub 的 Archive 功能，而且归档别人的公共仓库也不应由本账号执行。因此本归档采用“知识归档 + 可复现快照引用”的方式：

- 正文基于固定提交 `8c32a9d` 的实际内容，而不是 `main` 的最新状态；
- 记录精确提交、tree hash、许可证和复现命令，保证以后可以取回同一份源码；
- 不复制整份源码到本仓库：MIT 虽允许复制，但复制会带来体积、许可证归属和后续同步问题；固定提交的引用更适合长期归档。

上游在该提交的 tree hash 为 `3efbb036e5a56183c6bf642e2e1856a1f64e7be3`。

## 2. 归档内容

| 文档 | 回答的问题 |
| --- | --- |
| [01-overview.md](01-overview.md) | 它是什么？设计原则、角色分工、领域模型和工作项生命周期 |
| [02-architecture.md](02-architecture.md) | 它怎么实现？Runtime、Engine、持久化、副作用队列、Source、Executor、提示词、面板和部署 |
| [03-authorization-and-execution.md](03-authorization-and-execution.md) | 谁可以发起工作？请求如何被授权、执行、恢复和交付？ |
| [04-code-map.md](04-code-map.md) | 代码在哪里？模块职责、规模、测试地图、构建方式和质量门禁 |
| [05-assessment.md](05-assessment.md) | 哪些设计值得借鉴？有哪些边界和风险？核验结果如何？ |
| [metadata.json](metadata.json) | 机器可读的归档元数据与统计 |

## 3. 一页结论

1. **它是一个 DSH bundle，不是独立服务。** 它作为 DeepSeek Harness 的插件运行在专用 profile 中，复用 DSH 的 Session、工具、权限预设、Web 服务和持久化能力；自己的代码负责“监听来源 → 评估授权 → 创建工单 → 调度执行器 → 回写结果”。
2. **核心产品原则是“占用尽量少的人类注意力，给出尽量多的价值”。** 只有被请求或被书面规则允许时才行动；只在人需要行动或结果可用时说话；一次只问一个具体问题。
3. **双 Session 架构。** 主 Session（orchestrator）只做路由与评估，不读代码、不做技术决策；每个工单一个 Executor Session（worker），负责调查、实现、验证和交付。两者使用不同的 agent preset 与工具集。
4. **领域模型小而完整。** Source、Trigger、Thread、Eval、Decision、Mandate、Ticket、Assignment、Subscription、Channel、Policy 构成核心；文档专门列出了十余个“被拒绝的概念”，用来说明为什么没有引入它们。
5. **授权分成确定性 Gate 与模型 Assessment 两层。** 名单、是否 @、准入表、accept mode 先做确定性判断；主动候选再由模型按启用规则逐条研判。显式请求与订阅上下文走不同路径。
6. **可靠性靠“先存储、后执行”。** 每个变更在一个 SQLite 事务里完成，外部副作用经持久化 effect 队列在提交后执行；Outbox 保证消息幂等、按会话有序、可重试、可丢弃。
7. **执行器是一等工程对象。** 每个工单有独立的 DSH Session 和目录，prepare 命令负责 checkout；worker slot 控制并发；前台命令 5 秒转后台；turn 结束后后台工作最多再跑 30 分钟。
8. **Source 是插件协议。** GitHub 与 Feishu 是两个实现，共享 `SourceKind` 契约：配置 schema、表单字段、scope、policy、channel、thread context、环境变量、健康条目。cookbook 用 400 多行演示如何新增一个 Source。
9. **提示词是版本化配置，不是硬编码字符串。** 团队可覆盖三个团队段落和全部内置段落；环境段和策略段在每次模型请求时动态生成；升级会保留团队文本并标记“默认内容已更新”。
10. **工程完成度对研究原型而言很高。** 177 个 TS/TSX 文件、约 3.7 万行受版本控制代码、59 个测试文件、1,197 个测试用例；还有强制文档完整性、类 JSDoc、模型可见表面、本地化与样式的元测试。
11. **边界同样明显。** Executor 以操作员 OS 用户、`danger-full-access` 运行；命令包装器不是安全边界；只支持单个 github.com 仓库；SQLite 单进程锁；旧记录没有清理机制；上游自我声明是研究代码。

## 4. 关键数据

| 指标 | 值 | 口径 |
| --- | --- | --- |
| 受版本控制文件数 | 216 | `git ls-files` |
| TS/TSX 文件数 | 177 | 147 `.ts` + 30 `.tsx` |
| 受版本控制总行数 | 37,111 | `git ls-files \| xargs wc -l` |
| `src/` | 111 文件 / 15,587 行 | core 2,088；app 5,292；sources 2,059；executor 838；client 4,419；infra 347；根文件 544 |
| `tests/` | 59 个 spec + 6 个 fixture / 约 14,960 行 | 1,197 个测试用例（`vitest list`） |
| `docs/` | 9 篇编号文档 / 1,973 行 | 000–008 |
| `prompts/` | 15 个 Markdown / 438 行 | 含 `team/` 三个团队段 |
| `skills/` | 2 个内置技能 | GitHub、Feishu |
| SQLite schema | 11 | `SCHEMA_VERSION`，从 10 迁移 |
| npm 包 | `dsh-superagent@0.1.0`，`private: true` | 不发布到 npm |
| 运行时要求 | Node `^22.19.0 \|\| >=24.0.0`；DSH `^0.2.1-alpha.2` | `package.json` engines |
| 主要依赖 | `zod`、`proper-lockfile` | 其余为 DSH peer dependencies |

## 5. 复现与核验

取回同一份源码：

```sh
git clone https://github.com/deepseek-ai/dsh-superagent-prototype.git
cd dsh-superagent-prototype
git checkout 8c32a9dc5d72c033816c6a8110b37f40cf94fba4
git rev-parse HEAD^{tree}   # 3efbb036e5a56183c6bf642e2e1856a1f64e7be3
pnpm install
pnpm check                 # typecheck + vitest + build
```

如果需要一份**自包含的离线快照**，可以在 clone 后创建 bundle（本机实测约 776 KiB，适合随归档长期保存）：

```sh
git bundle create dsh-superagent-prototype-8c32a9d.bundle HEAD
git clone dsh-superagent-prototype-8c32a9d.bundle dsh-superagent-prototype-snapshot
```

归档时的实际核验（在部署机上的上游 checkout 中执行）：

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm typecheck` | 通过 | `tsc --noEmit` 退出码 0 |
| `pnpm test`（继承运行中 superagent 的环境） | 1,194 / 1,197 通过 | 2 个失败来自测试继承了运行中 agent 写入的 `GIT_CONFIG_GLOBAL`/`GIT_CONFIG_NOSYSTEM` 与 `worker-bin` PATH，不是源码失败 |
| `pnpm test`（清理上述环境后） | 1,196 / 1,197 通过 | 唯一失败是 Feishu event consumer 的健康状态用例；整文件运行时失败、单独运行时通过，属于时序/隔离敏感 |
| `pnpm exec vitest list` | 1,197 个用例 | 59 个 spec 文件 |
| `pnpm build` | 未在归档时执行 | 避免改写正在运行的部署所加载的 `lib/` 产物 |

上述测试结果是在上游源码和本地依赖文件（仅 `package.json`/`pnpm-lock.yaml` 的安装顺序与 `unrun` 增补差异）上得到的；源码与固定提交一致。详见 [05-assessment.md](05-assessment.md) 的“核验记录”。

## 6. 阅读顺序

- 想快速判断“这是什么、值不值得用”：读本页与 [05-assessment.md](05-assessment.md)。
- 想理解设计：按 [01-overview.md](01-overview.md) → [03-authorization-and-execution.md](03-authorization-and-execution.md) 阅读。
- 想复用实现：读 [02-architecture.md](02-architecture.md) → [04-code-map.md](04-code-map.md)，再对照上游 `docs/007-architecture.md` 和 `docs/008-cookbook.md`。
- 想自己部署：以归档提交中的 `SETUP.md` 和 `docs/006-deployment.md` 为准；本归档只做导读，不替代原文档。

## 7. 范围与限制

- 本归档**通读**了 9 篇设计文档、15 个提示词、2 个技能和 README/SETUP；**结构化阅读**了 `src/` 的关键实现（Engine、模型、策略、存储、effect、outbox、Source、Executor、Sessions、面板入口等），没有逐行审计全部 3.7 万行。
- 未执行完整部署演练：没有在本机按 `SETUP.md` 新建 GitHub 账号、Feishu bot 和 profile；部署部分依据文档与配置代码归纳。
- 未做安全审计、性能基准或模糊测试；文中的风险判断来自代码与文档的架构分析，不是渗透测试结论。
- 上游只有一个提交且仍在公开状态，后续可能变化；本归档所有事实以固定提交 `8c32a9d` 为准。社会指标是归档时的快照。
- 上游代码与文档版权归 DeepSeek Harness Team，MIT 许可证；本归档对其摘要、引用与评论，不改变原许可证。
