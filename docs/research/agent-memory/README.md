# Anthropic《The components of agent memory》精读与设计建议

> **对象：** Anthropic Engineering, *The components of agent memory*, 2026-11-06 — <https://www.anthropic.com/research/components-of-agent-memory>
> **交付物：** ① 文章逐节详细解析；② 对后续 agent memory 系统设计的建议。
> **撰写日期：** 2026-11-07。**语言：** 中文。

## 这是什么

这份文档把 Anthropic 这篇工程博客拆到"每一节讲了什么、依据是什么、数字是多少、结论的边界在哪里"，再把其中可迁移的机制整理成一套对**后续 agent memory 系统**可施工的设计建议。

它不是原文翻译，而是"精读 + 工程化"。原文中的每一条量化结论都保留了出处（图号 / 小节），无法从原文确认的部分一律标注为**推断**或**未验证**。

## 文档索引

| 文档 | 回答的问题 |
| --- | --- |
| **[01-article-analysis.md](01-article-analysis.md)** | 原文逐节解析：概念界定、五个记忆组件、全部实验与数字、作者自陈的开放问题 |
| **[02-design-recommendations.md](02-design-recommendations.md)** | 对后续 agent memory 系统的设计建议：参考架构、七个机制的设计准则、评估方法、反模式、分阶段落地 |
| **[03-claims-and-evidence.md](03-claims-and-evidence.md)** | 论断—证据对照表、证据等级、原文未给出的信息、可复现性缺口 |
| **[references.md](references.md)** | 全部引用（原文出链 + 本文补充），逐条核验记录 |
| [data/figures.md](data/figures.md) | 原文 Figure 1–15 的图注与 CDN 地址索引 |

**证据口径：** 本组文档区分三类来源——**原文事实**（同段标注图号/小节）、**原文链接的配套材料**（在 [02](02-design-recommendations.md) 中标为 `[A-外部]`）、**本文推断**（标注"推断"或 `[C]`）。原文的统计缺口（无置信区间、部分实验 n=1）在 [03](03-claims-and-evidence.md) 中单列，全文不把单案例数字当作效应量使用。

## 一页结论

**原文的核心命题：** agent memory = **模型从经验中获得、跨 session 保留、以可读上下文形式存下来的知识**。它明确排除了权重更新、单次会话内的 in-context learning、以及 compaction；也就是说，memory 是一个**上下文工程问题**，不是训练问题。

**原文的机制清单（本文按原文小节归并出五个组件；原文本身没有编号的组件列表）：**

1. **memory notes** —— session 进行中写入的显式笔记（文件、目录、数据库）；
2. **salience 判断** —— 由模型自己决定什么值得记，而不是预先写死规则；
3. **dreaming** —— 离线（异步）读回 transcript 与笔记，做纠错、建表示、升级层级、聚焦目标、补缺口；
4. **memory representations** —— 以 wiki 为代表的结构化、带链接的知识层，用于遍历与聚合；
5. **memory hierarchy** —— 顶部注入层（每 session 预加载，必须小）+ 下层按需读取层。

**原文四个最有分量的结论（按证据强度排序）：**

| 结论 | 原文证据 | 强度 |
| --- | --- | --- |
| **wiki 表示能显著提升大规模语料上的问答** | 25 题：dreaming 从 2 个 session 扩到 128 个，得分 13% → 48%（原文唯一的规模曲线） | 强（E3 规模曲线） |
| **让模型自己判断 salience，优于预先写死"记什么"的规则** | 设"只记录失败"后 Opus 5 / Opus 4.7 的记忆增益大幅下降；弱模型最需要引导（Sonnet 4.6 提示后近乎翻倍，Sonnet 5 无需提示就 10 次中 9 次先读记忆） | 中—强（同 benchmark 内对照，但样本与置信区间未给出） |
| **记忆的价值来自"屏幕上读不到的东西"** | Sonnet 3.7 写了 413 个文件 / 225 个目录、得 1 枚徽章；Fable 5 写 9 个文件 / 2 个目录 + `global.md`、得 4 枚徽章；Pokémon 状态每回合变化，记录它必然过期 | 中（单次运行对照，非统计） |
| **dreaming 能修正错误记忆并改变任务结果** | Mt. Moon 的 PokéCenter 方位笔记被 dreaming 对照 transcript 纠正后，Claude 重新进洞并抵达 Cerulean City；未纠正与无记忆两组都没过山 | 中（单案例，但因果链清楚） |

**最容易被忽略的两个结论：**

- **wiki 不是万能药，它的收益取决于任务形态。** 需要跨多文档聚合/推理时，wiki 把 73% 提到 87%（同一 benchmark 内对照）；单文档即可检索到的任务上 wiki 没有明显收益；更糟的是 wiki 可以长到**比原始语料还大**（Borges "精确地图" 反例），此时它什么也没抽象。
- **注入层是风险最高的地方。** 每 session 预加载的记忆既吃 token、又会在错误时**被带进未来每一个 session**；而加载不等于遵守（Claude Code 文档明确警告指令文件越长遵守度越低）。所以 hierarchy 顶层的设计目标不是"多放信息"，而是"**保持小**"——dreaming 在这里的主要工作是把细节往下移、只留链接。

**给后续 agent memory 系统的一句话建议：** 把 memory 当作**可审计、可版本化、有预算、有生命周期**的仓库来建——写入用模型判断 + 廉价捕获，整理用离线 dreaming 并强制对照 transcript，检索用"表示层 + 搜索"组合，注入层设硬上限，存储在读写分离与提示注入防护上按不可信边界处理。
