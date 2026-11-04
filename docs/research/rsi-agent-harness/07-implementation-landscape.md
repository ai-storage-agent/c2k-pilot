# 07 · 开源实现现状与组件复用

> 本页回答"现在有哪些可用的东西、哪些能直接复用、参考架构与已有系统的差距"。
> GitHub 事实来自 `gh search repos`（15 组检索，155 个去重仓库）与 `gh api repos/<owner>/<repo>` 逐库核验；快照时间 **2026-11-04**。
> 论文引用见 [references.md](references.md)。

## 1. 生态概览

按"仓库实际实现什么"分四类，而不是按 star 数排序：

| 类别 | 数量（≥400 stars） | 特征 | 对参考架构的用途 |
| --- | --- | --- | --- |
| **论文制品** | 8 | 与某篇论文一一对应，实现该论文的方法 | 学习具体机制；通常不做通用化 |
| **框架/基础设施** | 4 | 目标是可复用的通用组件 | **直接复用候选** |
| **精选清单** | 6 | 只做文献索引，无代码 | 找相关工作 |
| **其他** | 其余 | 应用、演示、玩具实现 | 一般参考 |

**一个重要观察：star 数最高的仓库（`affaan-m/ECC` 296k、`shareAI-lab/learn-claude-code` 80k、`langchain-ai/deepagents` 31k）不在本页表格里。** 它们属于"通用 coding agent harness"，而不是"自我改进的 harness"。这个区分很重要：**多数高星 harness 项目没有自我改进循环**，而这正是 RSI harness 的核心。

## 2. 框架与基础设施（复用候选）

| 仓库 | Stars | 语言 | 许可 | 最后推送 | 实现内容 |
| --- | --- | --- | --- | --- | --- |
| [Human-Agent-Society/reef](https://github.com/Human-Agent-Society/reef) | 7,793 | Python | Apache-2.0 | 2026-11-04 | "首个面向持续自我改进 agent 的开源基础设施"：连接推理、反馈、学习与版本化交付；可训练权重（Slime/SGLang）或演化 harness（提示词/规则/技能）；PyPI `reef-infra` |
| [china-qijizhifeng/agentic-harness-engineering](https://github.com/china-qijizhifeng/agentic-harness-engineering) | 959 | Python | MIT | 2026-10-30 | AHE 官方代码：可观测性驱动的 harness 自动演化，基础模型固定；三个可观测性层（组件＝NexAU 的七个文件级 git 跟踪部分 / 经验＝Agent Debugger 蒸馏约 1,000 万 token 轨迹 / 下钻）；报告 Terminal-Bench 2 pass@1 **84.7% ± 2.1**（[2604.25850](references.md#ref-2604-25850)） |
| [FrontisAI/OpenRSI](https://github.com/FrontisAI/OpenRSI) | 872 | Python | Other（README 声明 CC BY-NC 4.0） | 2026-09-17 | "可执行、可度量、可复现的 AI4AI"：Frontis-MA1 35B/30B 模型、OpenMLE Gym/RL/Evo 栈、OpenMLE-Tasks 数据集与 OpenMLE Sandbox 分布式执行后端 |
| [Infini-AI-Lab/hermit](https://github.com/Infini-AI-Lab/hermit) | 458 | Python | Apache-2.0 | 2026-11-04 | 训练/评估/部署 **harness adapter**：保持原模型与原 harness 冻结，只训练外部 harness 插件；v0.1.0（2026-10）支持 Meta-Harness Adapter、ReHarness、Harness² |
| [rsi-gear/gear](https://github.com/rsi-gear/gear) | 410 | TypeScript | MIT | 2026-11-04 | "RSI 的 scikit-learn"：模块化递归 **harness** 演化框架（npm `rsi-gear`）；对任务基准演化模型、指令、工具与工作流 |
| [Danielxu0208/rsi_eval](https://github.com/Danielxu0208/rsi_eval) | 369 | Python | Apache-2.0 | 2026-10-30 | 轻量 Python SDK/CLI，为 RSI 方法提供干净的 `candidate → evaluate() → feedback` 边界；覆盖 24 种评估配置（Terminal-Bench 2.0/2.1、SWE-bench Verified/Multilingual/Pro、Aider Polyglot、LiveCodeBench、MMLU、GPQA、ARC-AGI、MGSM、DROP）；带快照与逐任务 token/验证器记录 |
| [evolvent-ai/RSIGym](https://github.com/evolvent-ai/RSIGym) | 140 | Python | Other | 2026-11-03 | agent-native、服务化、**预算受控**的 RSI 环境：训练/推理/rollout/评估/沙箱均为服务；三条改进轨道（数据、harness、联合）；单一平台密钥与成本核算；定义跨五领域的 **RSI-Index** |

**评估：** 这些是当前最接近"通用 RSI 基础设施"的项目。`agentic-harness-engineering` 直接实现参考架构 [04 §4](04-reference-architecture.md) 所需的三个可观测性支柱（组件/经验/决策），是**最值得研究的单一实现**。`rsi-gear/gear` 是唯一 TypeScript/模块化框架；`hermit` 的"harness adapter"思路（冻结模型与原 harness，只训练外部插件）与参考架构 L2 的制品化高度契合；`rsi_eval` 与 `RSIGym` 是**评估平面**最直接的复用候选。


### 2.1 许可与维护风险（选型前必读）

> **请以仓库当前的 LICENSE 文件为准复核。** 下表为 2026-11-04 快照，许可证会变更。

| 仓库 | 许可 | 风险 |
| --- | --- | --- |
| `facebookresearch/HyperAgents` | **CC BY-NC-SA 4.0**（已核验 LICENSE.md 正文） | **非商业**；衍生作品须同许可；不应 vendor 进产品 |
| `FrontisAI/OpenRSI` | **CC BY-NC 4.0**（已核验 LICENSE 正文） | **非商业** |
| `zhengkid/Dream-RSI` | **无许可**（LICENSE 返回 404） | 无许可＝默认保留所有权利；**且无代码**（纯论文落地页，README 称 arXiv "coming soon"） |
| `ShaoShuai0605/Misevolution` | **无许可** | 默认保留所有权利 |
| `jennyzzt/dgm` | Apache-2.0 | 许可宽松，但**最后推送 2025-08-13**（约 15 个月无提交） |
| `ShengranHu/ADAS` | Apache-2.0 | 许可宽松，但**最后推送 2025-01-28**（实质休眠） |
| `Arvid-pku/Godel_Agent` | MIT | 最后推送 2025-09-17（约 14 个月） |
| `rsi-gear/gear`、`Infini-AI-Lab/hermit` | MIT / Apache-2.0 | 宽松，且活跃 |
| `lsdefine/GenericAgent`、`Human-Agent-Society/reef`、`agentic-harness-engineering`、`modelscope/AgentEvolver` | MIT / Apache-2.0 | 宽松，且活跃 |

**结论：** 若目标是商业部署，可自由使用的是 `reef`、`gear`、`hermit`、`agentic-harness-engineering`、`rsi_eval`、`dgm`、`ADAS`、`Godel_Agent` 等宽松许可项目；**必须排除** `HyperAgents` 与 `OpenRSI`（非商业），以及未声明许可的 `Dream-RSI` 与 `Misevolution`。同时注意 `dgm`/`ADAS`/`Godel_Agent` 已是"论文发布时的制品"，不应假设它们被维护。



## 3. 论文制品（学习具体机制）

| 仓库 | Stars | 最后推送 | 对应工作 | 学什么 |
| --- | --- | --- | --- | --- |
| [facebookresearch/HyperAgents](https://github.com/facebookresearch/HyperAgents) | 2,864 | 2026-07-31 | 自指的自我改进 agent | 元层/目标层的自指结构 |
| [jennyzzt/dgm](https://github.com/jennyzzt/dgm) | 2,482 | 2025-08-13 | [2505.22954](references.md#ref-2505-22954) Darwin Gödel Machine | **档案式开放搜索的参考实现**：准入门（编译 + 保留编辑能力）、分阶段评估（10→50 任务）、父代采样（性能 sigmoid × 逆子代数） |
| [ShengranHu/ADAS](https://github.com/ShengranHu/ADAS) | 1,659 | 2025-01-28 | [2408.08435](references.md#ref-2408-08435) | 元 agent 在代码空间搜索新 agent；跨域迁移实验 |
| [modelscope/AgentEvolver](https://github.com/modelscope/AgentEvolver) | 1,591 | 2026-11-04 | 高效自演化 agent 系统 | 自演化系统的工程实现 |
| [zhengkid/Dream-RSI](https://github.com/zhengkid/Dream-RSI) | 1,556 | 2026-11-04 | Dream-RSI：通过演化世界模型实现 RSI | 世界模型作为改进信号 |
| [aiming-lab/Agent0](https://github.com/aiming-lab/Agent0) | 1,287 | 2026-11-03 | Zero-Data 自演化 agent | 零数据自演化 |
| [Gen-Verse/RSI-Anything](https://github.com/Gen-Verse/RSI-Anything) | 1,112 | 2026-11-04 | [2610.13912](references.md#ref-2610-13912) | 用预测式世界模型选择学习数据 |
| [Arvid-pku/Godel_Agent](https://github.com/Arvid-pku/Godel_Agent) | 239 | 2026-10-30 | [2410.04444](references.md#ref-2410-04444) | 最早的自指 agent；注意其**弱安全、无约束编辑面**的教训 |
| [YuhuaJiang2002/HarnessMM](https://github.com/YuhuaJiang2002/HarnessMM) | 91 | 2026-11-04 | [2610.32813](references.md#ref-2610-32813) | 受守护的决策复用；token 效率作为 RSI 目标 |
| [amazon-science/Self-Evolving-Agents-Ratchet](https://github.com/amazon-science/Self-Evolving-Agents-Ratchet) | 6 | 2026-10-18 | Ratchet：自我改进 agent 的最小卫生配方 | **"最小卫生配方"这一概念本身很有价值** |
| [ShaoShuai0605/Misevolution](https://github.com/ShaoShuai0605/Misevolution) | 102 | 2026-10-18 | 自演化 agent 的涌现风险（misevolution） | 负面结果的可复现实现 |

**注意：** `jennyzzt/dgm` 与 `ShengranHu/ADAS` 的最后推送分别是 2025-08 与 2025-01，说明它们是**论文发布时的制品**，未持续维护。这与 [05 §10](05-implementation-blueprint.md) 的"论文主张 ≠ 已实现能力"纪律一致：可以学机制，不应假设它们是被维护的基础设施。

## 4. 精选清单（找相关工作）

| 仓库 | Stars | 内容 |
| --- | --- | --- |
| [ANative-Lab/Awesome-Self-Evolving-Agents](https://github.com/ANative-Lab/Awesome-Self-Evolving-Agents) | 2,516 | 自演化 AI agent 综述配套 |
| [Picrew/awesome-agent-harness](https://github.com/Picrew/awesome-agent-harness) | 1,904 | agent harness 工程资源清单（含 GitHub 项目） |
| [RyanAlberts/best-of-Agent-Harnesses](https://github.com/RyanAlberts/best-of-Agent-Harnesses) | 1,445 | 187 个 harness 的排名清单 + 模板/playbook |
| [lobehub/awesome-rsi](https://github.com/lobehub/awesome-rsi) | 941 | RSI 的策展研究地图：模型、agent、harness |
| [wkqdzkd/Awesome-Reliable-Self-Evolving-Agents](https://github.com/wkqdzkd/Awesome-Reliable-Self-Evolving-Agents) | 661 | 可靠自演化 agent 综述（可靠性视角） |
| [selfimproving-agent/Awesome-Self-Improving-Agents](https://github.com/selfimproving-agent/Awesome-Self-Improving-Agents) | 607 | 基础模型 agent 系统的自我改进清单 |

## 5. 生态观察

### 5.1 harness 已成为独立品类

清单类仓库中出现了专门的 "awesome-agent-harness" 与 "best-of-Agent-Harnesses"（187 个 harness 排名）。这与 [01 §3.2](01-landscape.md) 的文献观察一致：harness 在 2026 年成为独立研究对象。

### 5.2 但"可自我改进"与"是 harness"是两回事

这是本页最重要的判断：

| 维度 | 通用 agent harness | RSI agent harness |
| --- | --- | --- |
| 目标 | 完成任务 | 改进自己完成任务的能力 |
| 核心循环 | observe → act → verify | + diagnose → propose → gate → implement |
| 必需组件 | 工具、上下文、状态 | + 制品版本化、验收门、评估平面、血缘、回滚 |
| 主要风险 | 任务失败 | 静默的约束侵蚀与验证者退化 |
| 代表 | Claude Code、Codex、OpenHands、DeepAgents | DGM、SICA、AHE、L3M、HarnessBank |

**高星通用 harness 项目不提供 RSI 所需的治理与评估机制。** 把它们当作起点时，需要补的是 L3/L4/L5，而不是 L1。

### 5.3 少数项目提供了可直接复用的机制

按参考架构分层：

| 参考层 | 可直接借鉴的实现 |
| --- | --- |
| L0 沙箱 + Git 原生状态 | L3M（Lean 4、Git 状态轨迹、resume/rewind/fork/compare/merge） |
| L0 检查点持久化 | DeepSeek Harness 的 session checkpoint policy（原子、fail-closed） |
| L1 六职责 | DSH 的 system-prompt / agent-loop / tools / session-persistence / sandbox-policy |
| L2 制品版本化 | AHE 的文件级组件化 + 可回退表示；DSH 的 agent-preset registry 与 skill registry |
| L2 技能生命周期 | [2607.10113](references.md#ref-2607-10113) 的八阶段 / [2608.29596](references.md#ref-2608-29596) 的九阶段生命周期（规范，非代码） |
| L3 改进循环 | DGM 的档案 + 准入门 + 分阶段评估；HarnessBank 的 Gene Bank + Gated Screening |
| L3 诊断 | HarnessFix 的 HTIR（把失败归因到步骤**与**塑造它的 harness 制品） |
| L4 评估 | RSIGym 的 EaaS 服务化 + RSI-Index；SEAGym 的评估协议（train / frozen update-validation / held-out ID+OOD / replay / cost） |
| L4 预算分配 | [2610.37276](references.md#ref-2610-37276) 的稀疏搜索 + 定向确认 |
| L5 治理 | dsh-superagent 的确定性 gate + 结构化 assessment + `observe` 默认 + 人工审批点 + disposition/decision 审计记录 |
| L5 回滚 | EvoUndo 的可恢复性验证（irrecoverability 作为独立准入条件） |

## 6. 与 dsh-superagent 原型的差距分析

本仓库已有 [dsh-superagent 归档](../../archive/dsh-superagent-prototype/README.md)。它是 DSH 生态内的主动式编码 agent 研究原型。把它对照参考架构：

| 参考架构组件 | dsh-superagent 现状 | 差距等级 |
| --- | --- | --- |
| **L0 沙箱执行** | 以操作员 OS 用户、`danger-full-access` 运行；命令包装器明确**不是安全边界**；文档建议"要隔离就用专用 OS 账号" | **严重**——RSI 的每次候选评估都需隔离 |
| **L0 Git 原生状态** | 每工单一个 worktree；SQLite 存领域状态；有 schema 版本与迁移 | 中——缺"harness 版本"作为一等对象 |
| **L0 检查点** | 依赖 DSH Session 持久化；工单 Input 有"已取走/未取走"的持久化区分 | 小——可复用 |
| **L1 六职责** | 六职责都有实现（观测=文件/搜索/shell；上下文=compaction；控制=agent loop；动作=工具集；状态=Session/目录；验证=CI/review），但未被建模为**可修改面** | 中 |
| **L2 制品库** | 提示词版本化（团队可覆盖三个段落 + 全部内置段落，有基线记录与升级标记）；技能只有 2 个内置（GitHub/Feishu）；**无技能库生命周期** | 大——缺技能准入/修复/剪枝与 utility 信号 |
| **L3 改进引擎** | **基本不存在**：worker 完成任务，但不修改 harness 本身；提示词版本化是 RI 的雏形 | **核心缺口** |
| **L4 评估平面** | 有 typecheck、1,197 个测试用例、CI、review；**无分层 holdout、无血缘对比、无重跑审计、无 RSI-Index 式指标** | 大 |
| **L5 治理平面** | 确定性 gate（名单/是否 @/准入表/accept mode）+ 结构化模型 assessment（逐规则判定 + direction 三事实 + 证据）+ `observe` 默认模式 + 人工审批点 + 窄工具接口（`EngineFor*` 的 `Pick` 类型）+ 完整 disposition/decision 审计 | **最接近参考架构** |
| **成熟度** | 相当于"任务执行 harness" | 若要演进为 RSI harness，从 S1（上下文级）开始 |

### 6.1 可直接复用的三个设计

1. **确定性 gate + 结构化模型 assessment 的分层。** 这正好是参考架构 [04 §8.1](04-reference-architecture.md) 要求的"门是必要不充分条件"的工程实现：代码先做确定性判断，模型只在语义判断上发挥作用，代码再校验模型输出。
2. **`observe` 默认模式。** 主动工作的第一版是"记录我会做什么"，而不是"直接做"。这与参考架构 [04 §10](04-reference-architecture.md) 的 S0 阶段完全一致，是**安全放开自修改的正确起点**。
3. **双角色强隔离（Router 不读代码 / Worker 不改授权）。** 参考架构 [04 §9.3](04-reference-architecture.md) 直接采用了这个划分，因为它解决"用产生偏差的同一视角评估自己的产出"的问题。

### 6.2 必须先补的两个缺口

1. **执行隔离。** 参考架构的 L0 要求每次候选评估在沙箱中运行。dsh-superagent 的 `danger-full-access` 不是沙箱——用它评估自修改候选会让"改坏了"变成不可恢复。
2. **harness 版本化。** 参考架构的 `Manifest`（`{artifact_id: version}` 快照）是"当前 harness 是什么"的唯一答案。dsh-superagent 有工单目录和 SQLite 领域状态，但没有把"harness 配置"当作可提交、可 diff、可回退的对象。

## 7. 复用建议

| 若你要… | 建议路径 |
| --- | --- |
| 快速获得一个可用的 RSI 实验平台 | 从 `reef` 或 `agentic-harness-engineering` 开始；用 `rsi-gear/gear` 的模块化设计作接口参考 |
| 研究档案式开放搜索 | 读 `jennyzzt/dgm` 的实现（准入门、分阶段评估、父代采样），但注意它停止维护于 2025-08 |
| 在自己的 harness 上加自修改 | 先实现 [05](05-implementation-blueprint.md) 的 P0（基线 + 分层 split + 成本核算）+ P1（observe 模式），再考虑放开 |
| 复用治理机制 | 研究 dsh-superagent 的确定性 gate + 结构化 assessment + `observe` 默认 + 审计记录 |
| 复用沙箱与回滚 | 研究 L3M 的 Git 原生状态与"可逆性推导审查层级"；参考 EvoUndo 把可恢复性作为独立准入条件 |
| 找相关工作 | `lobehub/awesome-rsi`、`ANative-Lab/Awesome-Self-Evolving-Agents`、`Picrew/awesome-agent-harness` |

## 8. 局限与核验说明

| 项 | 说明 |
| --- | --- |
| 数据来源 | `gh search repos` 15 组检索（155 个去重仓库）+ `gh api repos/<owner>/<repo>` 逐库核验 |
| 快照时间 | 2026-11-04（UTC） |
| Stars/推送时间 | 快照值，会变化；部分仓库的最后推送即快照当天，说明活跃 |
| 许可 | 仅对已逐库核验的仓库标注；`—` 表示未在本次核验中取得 |
| 未做 | 未克隆、未构建、未运行任何仓库；未审计其代码质量或安全性 |
| "实现内容"口径 | 来自仓库描述与 README 摘要，不是代码审计结论 |
| 已知偏差 | `gh search repos` 按相关性排序，不是生态普查；star 数受推广影响 |
