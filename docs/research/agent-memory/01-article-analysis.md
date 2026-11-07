# 01 · 原文逐节详细解析

> **对象：** Anthropic Engineering, *The components of agent memory*, 2026-11-06。
> **来源：** <https://www.anthropic.com/research/components-of-agent-memory>（正文与全部图注由直连抓取核验，见 [references.md §1](references.md#1-原文出链核验)）。
> 本页按原文顺序逐节拆解；数字、引文与图号均来自原文，凡本文的推断都会显式标注"**推断**"。

## 1. 元信息与定位

> **说明：** 原文并没有给出一个编号的"组件清单"；本文的"组件一～五"是**笔者按原文小节归并**的框架（见 §4–§7），便于工程映射。原文的实际小节顺序（已核验页面标题层级）为：**Memory notes → Memory can be a prediction about what the future will need → Claude has learned to judge salience → Steering Claude to write memory → Dreaming can correct memory → …can build new memory representations → …can promote notes up the memory hierarchy → …can focus memory on a specific goal → …can fill in gaps a session leaves behind → Thinking backward, looking forward**。本文的 §4 合并了前两节与 salience 两节，§5 对应 Steering，§6 对应五个 Dreaming 小节。

| 项 | 内容 |
| --- | --- |
| 标题 | The components of agent memory |
| 发布 | 2026-11-06，Anthropic Engineering（Topics: Agents / Context engineering / Agent memory） |
| 作者 | Lance Martin（编辑：Caitlin Love, Tom Chivers, Rebecca Hiscott, Jake Eaton, Blake Wilson） |
| 性质 | 工程博客 / 经验总结，**不是**论文；没有方法学章节、置信区间或随机种子说明 |
| 主张类型 | ① 概念界定（memory 是什么、不是什么）；② 基于内部评测（CL-Bench、Pokémon Red、Stainless 语料、Harvey LAB）的机制有效性证据；③ 开放问题 |
| 开场引用 | 克尔凯郭尔："life can only be understood backward, but it must be lived forward"——对应文章结构：**向前运行（写记忆）+ 向后整理（dreaming）** |

文章的核心叙事是一条分工线：**session 内捕获（capture）** 与 **离线整理（consolidation）** 分开。前者廉价、即时，但占用主任务注意力；后者昂贵、异步，但能纠错、结构化、跨 session 找模式。这个分工直接对应人类记忆里"海马体即时编码 + 睡眠期 replay 巩固进新皮层"。

## 2. 定义：什么算 agent memory，什么不算

原文给的定义紧接着一段排除清单，这是全文最容易被跳过、但对工程决策最关键的一节。

**定义：** agent memory 是 Claude **从经验中获得**（包括与用户的交互和它被指派的任务）、**跨 session 保留**、**保存为它以后能读到的上下文**的知识。

**明确排除的四类"学习/上下文管理"：**

| 被排除项 | 原文理由 | 工程含义 |
| --- | --- | --- |
| **权重更新**（训练时写入参数） | 是模型能力，不是可读上下文 | 不能把 fine-tune 当作 memory 机制 |
| **in-context learning**（单次会话内获得） | 会话结束即消失 | 只有跨会话持久化才算 memory |
| **compaction**（Claude 写摘要替换旧轮次以在新上下文窗口继续） | 目的是"让当前会话继续"，不是积累知识 | compaction 与 memory 是两套机制，不要混用同一套存储 |
| （隐含）**上下文窗口本身** | 只是载体 | memory 必须是**外部持久化 + 可寻址**的 |

**为什么这个界定重要：** 它把 memory 严格锚定在**上下文工程**范畴。也就是说，本文讨论的所有改进都不改变模型权重，全部通过"往上下文里放什么、什么时候放、放多少"来实现。这决定了后续设计里 memory 系统的接口是**文件/目录/API**，而不是训练管线。

## 3. 神经科学类比与 dreaming 的来源

原文用三段建立类比，并据此引入 dreaming：

1. **海马体**在经验发生时即时捕获，让记忆形成快、立即可用；但只有一部分经验被巩固为长期知识。[引用 McNaughton et al. 1995 等神经科学文献]
2. **巩固大多发生在离线时**：睡眠与安静休息期间海马体 replay 近期经验，逐步蒸馏并整合进新皮层（"我们认为的知识"的主要存储）。
3. **睡眠期计算（sleep-time compute）**：Letta 与 UC Berkeley 提出让模型在交互间隙用空闲时间重组已有上下文。Agent 同样的思路——**反思日志、纠错、产出新笔记与表示**——被称为 **dreaming**。

原文引用的关键外部工作：

| 概念 | 出处 |
| --- | --- |
| sleep-time compute | arXiv:2504.13171（"让模型在 query 到来前离线思考 context"；原文用它支撑"离线算力换 test-time 成本"） |
| replay / 标记重要记忆 | Nature 385, 533（1996）等 |
| 巩固进新皮层 | Nature Neuroscience 22, 1659（2019） |
| 睡眠重放与蒸馏 | Nature Communications 9, 3920（2018） |
| dreaming（Google 的 Sleep framework） | Google Research blog |

**dreaming 能做四件事**（Figure 1 图注原文）：纠正错误、创建笔记、构建新的记忆表示、塑造"预先加载进未来 session 的内容"。后文再逐一给出证据。

## 4. 组件一：memory notes —— 写什么、谁来判断 salience

### 4.1 写笔记的两种时机

原文 Figure 2 描述了两条路径：

- **session 进行中打标**：在 session log 里标记 salient 事件，方便以后检索；
- **直接写入 memory store**（如一个 memory notes 目录）。

紧接着提出全文的**核心难点**：

> "But how can Claude tell what's salient in the moment, before it knows what's coming next?"

### 4.2 "memory 是对未来需求的一次预测"

原文这一小节给出的判断准则值得单独记：

- 写下一条**规则**，就是预测该模式会再次出现；
- 写下一条**已验证事实**，就是预测未来 session 会依赖它而**不做二次确认**。

因此记忆质量的下游风险是**"被信任但已错误"**——这直接引出后面的 dreaming 纠错。

### 4.3 CL-Bench 1.0 实验：学习闭环的四档能力

**任务设定**（原文 §"Memory can be a prediction about what the future will need"）：Continual Learning Bench (CL-Bench) 1.0 的 database 任务——Claude 通过查库回答一系列问题；每次作答后**被告知正确答案**，并可写记忆帮助后续问题。使用 Claude Managed Agents 运行；**每个问题开一个全新 session**，唯一跨 session 的是**持久 memory 目录**。

**模型表现的四档**（原文给出的能力阶梯）：

| 模型 | 记忆行为 | 是否闭合成学习环 |
| --- | --- | --- |
| Claude Sonnet 4.6 | 会生成"为什么答错"的理论；记忆目录里散落多个文件，每个列若干**未经验证的猜测** | 否 |
| Claude Opus 4.7 | 把笔记**合并成单一参考文档**，开始标注"已核对/未确认" | 部分 |
| Claude Sonnet 5 | grader 核对后**把每个答案标为 confirmed**，答错时写更正 | 原文未称其"闭合环"（只把 Opus 5 称为第一个闭合环） |
| **Claude Opus 5** | **第一个闭合环**：多数条目包含一条规则 + "我怎么知道这条规则是真的" + 早期问题的答案 + 发现的陷阱警告 | 是 |
| Claude Opus 5.5 / Sonnet 5.5 | 同样闭合环，用记忆捕获"如何最好地回答未来问题"的**已验证规则**；有记忆时得分与 Opus 5 大致相同，但**无记忆的 baseline 略高** | 是 |

**可提取的机制：** 有效记忆条目的最小结构是 **规则 + 证据/来源 + 适用范围 + 已知陷阱**。只存"猜测"（Sonnet 4.6）或只存"结论"（无证据）都不足以跨 session 复用。

### 4.4 Pokémon Red 实验：salience 判断的悬殊差异

**设定**（Figure 4）：每个 run 开始时给模型一个可读写的 memory 文件夹，模型在游戏过程中自行读写。比较 **Sonnet 3.7** 与 **Fable 5** 各一次 run，在约 **10,000 步**处的记忆目录。

| 指标 | Sonnet 3.7 | Fable 5 |
| --- | --- | --- |
| 记忆文件数 | **413 个文件，225 个文件夹** | **9 个文件，2 个文件夹** + 顶层 `global.md` |
| 记录倾向 | 假定"什么都可能有用"，**不加区分地写**：每场战斗、每件道具、每个 NPC 都可能单独成文件 | 只记录**游戏不会显式告诉它**的东西 |
| 进度 | **1 枚徽章** | **4 枚徽章** |

**为什么"记全"是错的**（原文给出的机制解释，也是全文对工程最有指导性的一段）：

- Pokémon 的**游戏状态每回合都在变**（金钱、地图位置等），详细记录**持续过期**；
- 因此随着进度推进，Claude 要花越来越多时间与资源**翻自己的记忆**，而不是玩游戏；
- 具体证据：约第 10,000 步时 Sonnet 3.7 开始建**第四套 "master" memory 文件**；**接下来 17 步里创建 6 个文件、删除 9 个文件、游戏内一个动作都没做**；
- 对照：Sonnet 3.7 记的很多东西（金钱、地图位置）**每回合都能从屏幕上读出来，存下来是冗余**；而策略、计划、验证过的规则**只有 Claude 想出来才存在，不写下来就消失**。Fable 5 正是据此组织记忆。

**Fable 5 的记忆结构**（可复用的模式）：

| 文件/目录 | 作用 |
| --- | --- |
| `global.md` | **仪表盘**：当前目标 + 预先写好的道馆攻略计划 + **模型自己使用记忆的规则** |
| `locations/` | 特定路线的导航计划 |
| `gameplay/` | 从游戏行为中学到的策略 |

策略条目的实例（原文引用）：

> "If 3+ balls fail in a row, VARY the timing (insert extra 'wait' presses between menu steps) - the catch landed right after doing this."

**Opus 5.5 的收敛：** 保持一个**小**记忆文件夹，跟踪当前目标与下一步，边玩边重写，最终**通关**。三者合起来给出一条一致的趋势：**记忆目录更小、进度更高**（原文未将其绘制为连续曲线，此处为本文归纳）。

## 5. 组件二：steering —— 告诉模型 memory 是干什么的，但不告诉它怎么用

原文原话：

> "We've found that it helps to tell Claude what memory is for, but not how to use it."

三组对照实验：

### 5.1 一般性引导已经足够（强模型）

在 CL-Bench 上，**只是告诉 Claude"有一个 memory 文件夹可用"**就够了：Opus 4.7 与 Opus 5 借此有效使用记忆，性能有明显提升（Figure 3）。

### 5.2 写死"记什么"的规则会削弱强模型

测试方式：**每个测试只给一条规则**，比较"有该规则时的记忆增益"与"无该规则时的记忆增益"。

- 规则设为 **"只记录失败"**（record only failures）时，**Opus 5 与 Opus 4.7 都失去了大部分记忆增益**（Figure 5 右）。

结论：**对强模型，给模型自主判断 salience 的自由，优于预先设定固定规则；这些规则反而可能削弱性能。**

### 5.3 引导对弱模型帮助最大

- Sonnet 4.6 经常**根本不读** memory 目录，也不验证自己的错误理论；
- 提示它"回答前先读记忆文件"并且"显式测试自己的理论"后，**benchmark 分数几乎翻倍**（Figure 5 左）；
- Sonnet 5 无需提示：**10 次里有 9 次**先读记忆再作答；Sonnet 4.6 **不到一半**。

### 5.4 前沿模型的实际引导量

> "With frontier Claude models, we typically give simple guidance to create memory notes when a person asks them to or when something is clearly worth remembering, and we leave that judgment up to Claude."

即：**触发条件（人要求 / 明显值得记）+ 判断权交给模型**。

## 6. 组件三：dreaming —— 五类被验证的整理能力

原文先给问题定义：session 内写的笔记**可能一开始就是错的，也可能随环境变化而漂移**，而后续 session 会**读到并信任**它。Dreaming 的价值就是**拿笔记去对照原始 transcript**。

### 6.1 纠错：Mt. Moon 案例（Figure 6–8）

**游戏背景：** Mt. Moon 是洞穴系统，入口在西、出口在东；入口附近有一个**单向台阶**，会把玩家扔回进来的路线且难以爬回。Claude 以入口处的 PokéCenter 为地标，走不走下台阶取决于它**认为 PokéCenter 在山哪一侧**。

**错误链条（逐条来自原文）：**

1. Claude 写下（**错误地**）PokéCenter 在**东侧**；
2. 走出 PokéCenter 后宣布 "Mt Moon is behind me"，并把笔记更新为 "Mt Moon DONE"；
3. 几步后走下单向台阶，落回原路；
4. 导航工具**没有显示这次下坠**，于是 Claude 推断 "I overshot far west"，并认定自己一直站对了边——**其实没有**。

**dreaming 的效果：** 对含有错误方位的记忆文件夹跑 dreaming，Claude **对照 session transcript 检查笔记、发现错误并重写**；transcript 提供了可验证的 ground truth。

| Run | 结果 |
| --- | --- |
| **有经 dreaming 纠正的笔记** | 直接重新进入 Mt. Moon，最终抵达 **Cerulean City** |
| **未纠正的原始记忆** | 三次掉回原路；第三次后写下 "I'm going to stop rather than keep looping"；setup 的自动回复让它继续，于是一路退回山洞前的 **Pewter City** 想治疗补货；run 结束时**从未抵达 Cerulean City** |
| **完全没有记忆** | 同样没过山（Figure 8 对比） |

**机制要点：** 这里真正起作用的是 **"记忆 ↔ 原始 transcript 的双向可追溯"**。没有 transcript 作为 ground truth，纠错无从验证。

### 6.2 建新表示：wiki（Figure 9–12）

**表示的定义（原文）：** *wiki* 是 Claude 自己写和维护的页面集合，汇集它关于某一主题所知，并**链接到其他笔记**；这些链接构成一张可用来**在记忆里导航、定位**的地图。

**Stainless 语料实验：**

| 项 | 值 |
| --- | --- |
| 语料 | 内部文档，**约 350,000 个文件、约 420M tokens**（Stainless，2026-05 被收购） |
| 评测集 | 关于该语料的 **25 个问题** |
| 工具 | 一个 **search 工具** + 指令让 Claude 用 dreaming 基于文件建 wiki |
| dreaming 规模 | **128 个 session**；提示 Opus 5 agents 浏览文件、写/改 wiki 页、合并重复、**对照来源核验主张** |
| 协调机制 | 每个 session **基于前序 session 的进度**，通过**共享 log** 协调 |
| 结果 | 把 dreaming 从 **2 个 session 扩到 128 个 session**，25 题上的得分从 **13% → 48%**（graded criteria 口径） |

**wiki 是增量构建的：** 先建初始 wiki，后续 dreaming 轮次继续增补、编辑、剪枝。原文的类比是：早期轮次的 wiki 像**新员工**的知识，仅凭 wiki 答题能力有限；dream 越多，知识地图越像**老员工**。

**收益的精确口径（原文给出的三者对照）：**

| 配置 | 分数 |
| --- | --- |
| 仅 search 工具 | **53%** |
| search + wiki（wiki 随规模增长） | **54% → 61%** |
| **仅 wiki**（最佳分） | **48%** |
| 附带成本收益 | search + wiki **每题省约 20,000 tokens** |

**Harvey LAB benchmark 实验（Figure 11）：** 用一批关于某并购案（merger）的文档，比较"从 wiki 回答"与"直接文件搜索"。

- **适合 wiki 的任务**：24 个关于该并购案的问题，**过半数需要跨多个文档找信息**，很多还需要判断或算术。在这类条目（原文图中红线/橙线）上：**用 wiki 87% vs 仅搜索 73%**。
- **不适合 wiki 的任务**：某项 LAB 任务的 brief 评分点**大多可用文本搜索从单个文档取到**；此时 wiki **相对搜索没有明显增益**。
- **反例（Figure 12）**：另一项 LAB 任务里，**wiki 长得比原始文档还大**——原文用博尔赫斯《论科学的精确性》里"和帝国一样大的地图"作比：**这样的 wiki 实际上什么也没抽象**。

### 6.3 升级层级：把笔记浮到 memory hierarchy 顶端并预加载（Figure 13）

dreaming 还可以把笔记**提升到记忆层级顶部**，由 agent harness **在每个 session 开始时预加载进上下文**，于是 Claude 不需要搜索，甚至不需要知道"有东西可搜"。

原文对这一层给出三条硬约束：

1. **注入的记忆消耗宝贵 token**；
2. **一条错误笔记会被带进未来每一个 session**；
3. **加载不等于遵守**——原文引 Claude Code 文档的警告：指令文件越长，遵守度越低。

因此结论：**顶层必须保持相对小**；而 dreaming 在这里的**主要工作恰恰是维持这个小**——把细节**往下移**，只留**链接**。

**Claude Code auto memory 的同构做法（原文引作实例）：**

- 并非把所有 auto memory 载入每次会话；
- 只加载 `MEMORY.md` 的**前 200 行或前 25 KB**；
- 这段 header 充当**索引**，告诉 Claude"它知道什么、在哪里找"。

### 6.4 聚焦目标：dreaming 的方向由指令决定（Figure 14）

原文以 **Claude Duet** 为例：助手类产品的记忆常需要**围绕它服务的人**组织，dreaming 可以被调成**为特定目标建记忆**。

**LAB 并购实验的失败→修复（一组非常具体的工程教训）：**

| 阶段 | 做法 | 结果 |
| --- | --- | --- |
| 初始 | 只给"生成 wiki"的基础指令，不说明 wiki 该怎么用 | 多个 agent **同时写同一张共享的 contract terms 表**；互相覆盖、摘要质量差、部分条款丢失 |
| 评分 | 从该 wiki 生成的 brief | **57 条合同事实里只覆盖 41 条（72%）** |
| 改进手段 | 跑一个 loop：**Claude 反思失败 → 提出指令修改 → 重建 wiki** | Claude 自己发现"合同条款是最重要的"，并据此重写建 wiki 的指令 |
| 改进后 | **每份合同一个页面，由单个 agent 写，逐字引用条款**而非汇总进共享表 | **100% 的评分标准被满足**（从 72% 提升） |

原文对失败根因的措辞值得原样保留：

> "The contract terms were the most important part of the wiki, but the instructions didn't say that."

**可提取的规则：** ① **不要多个 writer 并发写同一页**（写者要么串行，要么按 key 分片）；② 对**逐字事实**（条款、编号、金额）用**引用**而非摘要；③ **指令本身可以被反思循环改进**；④ 记忆焦点由指令决定，指令缺失就会被"平均化"处理。

### 6.5 补缺口：跨 session 找模式 / 二次 dreaming pass（Figure 15）

session 内写记忆时只能看到**当前 session 的上下文**；dreaming 能**跨多个 session**找共同模式或共同错误。

具体案例（LAB benchmark 建 wiki 时）：

- Claude **链接到了尚未创建的页面**；
- **第二次 dreaming pass** 修复了这些缺口：在某个任务上，dreaming 发现 **9 个指向缺失页面的链接**，把它们**重指到同一文档已存在的页面**；并**新增 3 个页面**（含一个 index）改善 wiki。

## 7. 组件四/五：表示与层级——文章的组织结论

把上面的实验合并，原文实际给出的是一套**分层记忆栈**（Figure 13）：

```text
注入层（每 session 预加载，硬上限，必须小）
  └── 索引 / 当前目标 / 已验证规则 / 计划
        ↓ 只留链接
表示层（wiki / 主题页 / 结构化笔记，按需读取）
        ↓
原始层（session transcript、原始文档、日志）
        ↑ 检索与回溯（search、links）
```

配套的操作规则（全部来自原文证据）：

| 层 | 写入者 | 读取方式 | 关键约束 |
| --- | --- | --- | --- |
| 注入层 | dreaming 提升 + 人工/agent 维护 | 每 session 自动加载 | 硬上限（如 200 行 / 25 KB）；保持小；错误会被全局放大 |
| 表示层 | dreaming + session 内写入 | 链接导航 + search 工具 | **与 search 组合**才有最大收益；必须防膨胀（可大于语料本身）和防幻觉 |
| 原始层 | harness 自动记录 | 全文检索 / 引用溯源 | 是 dreaming 的 **ground truth** |

## 8. 文章自陈的开放问题

原文章节 "Thinking backward, looking forward" 明确列出四个未解问题，本文原样归纳：

1. **何时创建记忆？** session 内写能"在源头捕获 salience"，让重要细节对后续轮次/会话立即可用；但**在当下记笔记必然分散主任务注意力**。dreaming 能把记忆创建推到后台，但**dreaming 的产出不保证立即可用**。
2. **如何让记忆可靠地保持最新？** Claude 可能做出**错误的预测**，或写入**从一开始就错**的规则；记忆也会随环境变化**漂移、变得不相关**。dreaming 是修复手段之一，但**需要算力**；让 Claude **持续检查所有记忆并不现实**——更可能的方向是**把 dreaming 聚焦在"可能会变"的信息上**，或**仔细调 dreaming 的节奏**（例如根据记忆被访问的频率）。
3. **transcript search 是否是记忆的基础？** 原文认为把 **表示（如 wiki）+ 搜索**组合起来"有时有效"，但 Claude 必须**持续消耗算力维护表示**，确保它**不积累错误或幻觉**。
4. **能力增长会改变结论。** 即便 salience 判断在进步，**没有模型能真正知道未来轮次会发生什么**；dreaming 给了"向后看、用算力组织记忆"的机会。原文结尾明确：**"Memory systems will evolve as Claude gets more capable."**

## 9. 与原文配套的产品机制（用于对照理解）

原文链接到的实际产品机制为"概念 → 落地"的映射提供了细节（详见 [references.md §3](references.md#3-本文补充的对照材料)）：

| 原文概念 | 对应机制 | 关键细节 |
| --- | --- | --- |
| memory store（文件夹） | Managed Agents **memory stores** | 挂载到 sandbox 的 `/mnt/memory/` 目录；每条记忆 ≤ 100 kB（约 25k tokens）、每 store ≤ 10,000 条；**建议拆成多个小文件而非少量大文件**；**每次修改生成不可变 memory version**（审计与时间点恢复）；每个 session 最多挂 8 个 store；`read_write` 为默认，**处理不可信输入时应改 `read_only`**（防提示注入把恶意内容写成"被信任的记忆"） |
| dreaming | Managed Agents **Dreams**（research preview） | 异步 job，输入 = 一个已有 memory store + **1–100 个历史 session transcript**；输出是**另一个** store；**输入 store 永不被修改**，可审阅后使用或丢弃；`instructions` 是**高层综合指引**而非逐行编辑指令；支持 `model` 选择 |
| 注入层上限 | Claude Code **auto memory** | 每 session 只加载 `MEMORY.md` 前 200 行或 25 KB；header 作为索引；超出部分下次加载即丢弃；**auto memory 是机器本地的，同一 git 仓库的所有 worktree 共享一个目录**；会话 transcript 会按保留期清理，但 memory 文件**被排除在清理之外** |
| wiki | Anthropic **knowledge-wiki** quickstart（Managed Agents cookbook） | 把语料**一次性**读成 wiki（纯 markdown，存放在 memory store），之后**只读**回答；每条事实带 provenance；**文档间的冲突保持为冲突**，被取代的数字保持被取代状态；规模经济：小模型 + wiki 的答案成本约为"大模型直接搜原始文档"的 **1/15**，比小模型自己搜文档好约 3 个点；**构建一次性成本约 $19**（记录 run 约 $16），在该 benchmark 的用量下**约 240 次提问后回本** |
| wiki 模式的外部同源设计 | Karpathy 的 **LLM Wiki** 模式 | 三层：**不可变原始来源 / LLM 全权维护的 wiki / 模式文档（如 CLAUDE.md）**；`index.md`（内容目录，回答前先读）+ `log.md`（append-only 时间线，可用 `grep "^## \["` 提取）两个特殊文件；**"好答案应当回写进 wiki 成为新页面"**；定期 **lint**（矛盾、过期主张、孤立页、缺失概念页、缺交叉引用、数据缺口） |

**注意区分证据等级：** §2–§8 是原文所述；§9 是原文**链接的配套资料**，用于说明机制细节，**不构成对原文结论的独立验证**。

## 10. 批判性观察（本文的分析，非原文结论）

以下是阅读原文时发现的**证据边界与内部张力**，后续设计时应据此调整对结论的信任度：

| 观察 | 依据 | 影响 |
| --- | --- | --- |
| **Pokémon 结论来自"各一次 run"** | 原文明确写 "one run each of Sonnet 3.7 and Claude Fable 5" | 413 vs 9 个文件、1 vs 4 枚徽章的差距极大且方向一致，**叙事可信**，但**不能当作统计效应**；把它当作"设计假设"而非"已验证定律" |
| **Mt. Moon 同样是个案** | 单一场景前后对照 | 因果链清楚（transcript 作为 ground truth → 纠正 → 行为改变），但**未给重复次数与成功率** |
| **wiki 收益的表述是 best-vs-aggregate** | 原文同时给出"仅 wiki **best score** 48%"与"仅 search **aggregate** 53%"、"search+wiki aggregate 54%→61%" | 三个数字并非同一统计量（best-of vs aggregate），引用时必须**带口径**，不要简化为"wiki 提升 X%" |
| **CL-Bench 增益只有方向性描述** | 原文 Figure 3 给图未在正文给具体分数 | "几乎翻倍"（Sonnet 4.6 引导后）只有这一处是数字，其余是定性描述 |
| **stainless 语料的规模优势无法外推** | 350k 文件 / 420M tokens 的企业内部语料 | 小语料上模拟 RAG 的 `index.md` 方案可能更划算（Karpathy 模式的经验值：约 100 来源 / 数百页时索引文件足够） |
| **"不要写死规则"的适用范围** | 原文自己说规则"可能削弱性能"（could end up weakening performance），且观察到**弱模型最需要规则/引导** | 正确读法是**随模型能力与任务调整约束强度**，不是"永不写规则" |
| **成本未量化** | 128 个 dreaming session、每题省 20k tokens、build cost ~$19 是文中少数成本信息；**没有**"dreaming 需要多少算力才划算"的一般结论 | 原文把 cadence 调优列为开放问题，说明**这笔账还没算清** |

## 11. 一页速查：原文的机制—证据—数字

| 节 | 机制 | 关键数字 / 证据 | 图 |
| --- | --- | --- | --- |
| 定义 | memory = 跨 session 的经验知识，排除权重/ICL/compaction | — | — |
| memory notes | session 内标记或写入 memory store | — | Fig 2 |
| CL-Bench | 每问新 session + 持久 memory 目录 | 四档模型：猜测 → 单文档标注 → confirmed/更正 → 闭合成"规则+证据+陷阱" | Fig 3 |
| Pokémon salience | 模型自判重要性 | 413 文件/225 目录/1 徽章（Sonnet 3.7） vs 9 文件/2 目录+global.md/4 徽章（Fable 5）；17 步里 6 建 9 删、0 动作 | Fig 4 |
| steering | 告诉 memory 用途，不规定用法 | "只记录失败"使 Opus 5 / Opus 4.7 增益大跌；Sonnet 4.6 引导后近乎翻倍；Sonnet 5 自发先读记忆 9/10 | Fig 5 |
| dreaming 纠错 | 对照 transcript 验证笔记 | Mt. Moon：纠正后抵达 Cerulean City；未纠正/无记忆均失败 | Fig 6–8 |
| dreaming 建表示 | 增量维护 wiki | 350k 文件/420M tokens；25 题：2→128 session，13%→48%；仅 search 53%，search+wiki 54%→61%，仅 wiki 48%；每题省 ~20k tokens | Fig 9–10 |
| wiki 边界 | 跨文档聚合有效，单文档无增益，可膨胀 | 24 题跨文档：87% vs 73%；单文档任务无增益；wiki 可大于原始语料 | Fig 11–12 |
| hierarchy | 顶层注入 + 下层按需 | 每 session 预加载；必须小；Claude Code 载 `MEMORY.md` 前 200 行/25 KB | Fig 13 |
| 聚焦目标 | 指令决定 dreaming 方向 | 并发写共享表 → 41/57（72%）；一合同一页逐字引用 → 100% | Fig 14 |
| 补缺口 | 二次 dreaming pass | 9 个坏链重指 + 新增 3 页（含 index） | Fig 15 |
