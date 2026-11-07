# references · 引用与核验记录

> 本文全部引用分三类：**§1 原文出链**（从文章 HTML 中提取，逐条进行可达性核验）、**§2 抓取与核验方法**、**§3 本文补充的对照材料**。
> 核验时间：**2026-11-07（UTC+8）**。凡未通过核验的链接一律不写入正文，或在表中显式标注失败原因。

## 1. 原文出链核验

下表的 **23 条**条目中，22 条为文章页面 HTML 的 `<a href>` 外链（原文正文与图注同样由该页面直连抓取核验），另 1 条为文章本体地址；全部逐条请求核验 HTTP 状态。

| 类别 | 标签（原文用词） | URL | 状态 |
| --- | --- | --- | --- |
| 文章本体 | The components of agent memory | <https://www.anthropic.com/research/components-of-agent-memory> | 200 |
| 相关文章 | Harness design for long-running application development | <https://www.anthropic.com/research/harness-design-long-running-apps> | 200 |
| 神经科学 | The hippocampus（McNaughton et al. 1995） | <https://stanford.edu/~jlmcc/papers/McCMcNaughtonOReilly95.pdf> | 200 |
| 神经科学 | some experiences（Science, adk8261） | <https://www.science.org/doi/10.1126/science.adk8261> | **403**（站点对自动抓取返回 403；链接本身有效，未据此页面核对内容） |
| 神经科学 | rest（Nature Communications 9:3920） | <https://www.nature.com/articles/s41467-018-06213-1> | 200 |
| 神经科学 | consolidate into neocortex（Nature Neuroscience 22:1659） | <https://www.nature.com/articles/s41593-019-0467-3> | 200 |
| 离线算力 | sleep-time compute（arXiv:2504.13171） | <https://arxiv.org/abs/2504.13171> | 200 |
| 产品机制 | dreaming（Managed Agents Dreams 文档） | <https://platform.claude.com/docs/en/managed-agents/dreams> | 200 |
| 外部工作 | The Sleep framework（Google Research blog） | <https://research.google/blog/the-sleep-framework-a-new-way-for-llms-to-retain-knowledge-in-continual-learning/> | 200 |
| 概念界定 | in-context learning（Anthropic research） | <https://www.anthropic.com/research/in-context-learning-and-induction-heads> | 200 |
| 概念界定 | compaction（Claude 平台文档） | <https://platform.claude.com/docs/en/build-with-claude/compaction> | 200 |
| 神经科学 | mark a memory（Nature 385:533, 1996） | <https://www.nature.com/articles/385533a0> | 200 |
| 产品机制 | write（memory tool 文档） | <https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool> | 200 |
| 评测 | Continual Learning Bench (CL-Bench) 1.0 | <https://continual-learning-bench.com/news/cl-bench-1-0/> | 200 |
| 产品机制 | Claude Managed Agents | <https://platform.claude.com/docs/en/managed-agents/overview> | 200 |
| 产品机制 | memory directory（memory stores 文档） | <https://platform.claude.com/docs/en/managed-agents/memory> | 200 |
| 评测 | Claude Plays Pokémon（YouTube） | <https://www.youtube.com/watch?v=CXhYDOvgpuU> | 200 |
| 模式 | wiki（Karpathy 的 LLM Wiki gist） | <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f> | 200 |
| 评测 | Harvey LAB | <https://github.com/harveyai/harvey-labs> | 200 |
| 产品机制 | Claude Code memory | <https://code.claude.com/docs/en/memory> | 200 |
| 产品 | Claude Duet | <https://support.claude.com/en/articles/17631495-get-started-with-claude-duet> | 200 |
| 配套教程 | dreaming cookbook（dynamic workflow） | <https://platform.claude.com/cookbook/managed-agents-cma-dreaming-with-a-dynamic-workflow> | 200 |
| 配套教程 | knowledge wikis quickstart | <https://github.com/anthropics/claude-quickstarts/tree/main/managed-agents/knowledge-wiki> | 200 |

> 说明：`platform.claude.com` 与 `code.claude.com` 在当前网络直连会返回 “App unavailable in region”，本表状态通过 HTTP 代理（`http://127.0.0.1:1234`）核验；`www.anthropic.com` 与 `arxiv.org` 等可直连。

## 2. 抓取与核验方法

| 项 | 做法 |
| --- | --- |
| 原文正文 | `curl` 直连文章页（HTTP 200，242,416 bytes），去除 script/style 后转文本；全文 119 行、约 25k 字符 |
| 图注 | 从 HTML 的 `<figure>` 节点提取，共 **15 个 figure**，逐个核对图注文字与正文引用（Figure 1–15） |
| 出链 | 正则提取全部 `<a href>`，去重后得到 24 条绝对链接；扣除站点导航（Claude.ai / Claude console）后，正文引用、图注、相关文章与配套资料共 22 条，全部纳入 §1 |
| 关联文档 | Managed Agents memory / Dreams、Claude Code memory、knowledge-wiki quickstart、Karpathy gist 均抓取全文后读取相关小节 |
| sleep-time compute | 从 arXiv 摘要页提取 Abstract 原文，用于核验本文对"离线算力"的表述边界 |
| 核验原则 | 未成功抓取的内容不写入正文；仅在明确标注来源时引用第三方材料 |

**关于评测页的局限（诚实记录）：** `continual-learning-bench.com/news/cl-bench-1-0/` 页面为客户端渲染，抓取到的可见正文只有标题与团队署名，**未能获得 CL-Bench 1.0 的任务定义与评分细节**。因此本文对 CL-Bench 任务的描述**全部来自 Anthropic 原文**，未使用该站点内容作为独立佐证。

## 3. 本文补充的对照材料

以下材料**不在**原文出链中，仅用于把原文机制映射到具体接口形态（在正文中相应位置已标注为外部实践，不构成对原文结论的独立验证）。

| 材料 | 用途 | 来源 |
| --- | --- | --- |
| Managed Agents **memory stores** 文档 | 记忆大小上限、版本、访问模式、注入风险的接口细节 | <https://platform.claude.com/docs/en/managed-agents/memory>（与原文出链同一文档） |
| Managed Agents **Dreams** 文档 | dreaming 的输入/输出契约、状态机、instructions 语义 | <https://platform.claude.com/docs/en/managed-agents/dreams>（同上） |
| Claude Code **auto memory** 文档 | 注入层硬上限、机器本地作用域、时间戳、清理策略 | <https://code.claude.com/docs/en/memory>（同上） |
| Anthropic **knowledge-wiki** quickstart | 表示层的成本结构、provenance / conflict 保持策略 | <https://github.com/anthropics/claude-quickstarts/tree/main/managed-agents/knowledge-wiki>（同上） |
| Karpathy **LLM Wiki** 模式 | `index.md` / `log.md` / ingest-query-lint 操作循环 | <https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>（同上） |
| **sleep-time compute**（arXiv:2504.13171） | 离线算力换 test-time 成本的原始量化结果 | <https://arxiv.org/abs/2504.13171>（同上） |
| 本仓库既有调研 [RSI Agent Harness 参考架构](../rsi-agent-harness/README.md) | 交叉印证"先建评估平面，再建改进引擎"等结论 | 本仓库 `docs/research/rsi-agent-harness/` |

**sleep-time compute 摘要要点（供核对本文表述）：** 通过"在 query 之前离线思考 context、预计算有用量"来降低 test-time 成本；在 Stateful GSM-Symbolic 与 Stateful AIME 上可把达成同准确率所需 test-time compute 降低约 **5×**，通过扩展 sleep-time compute 可再提升准确率最多 **13%**（GSM-Symbolic）/ **18%**（AIME）；对同一 context 的多个相关问题摊薄后，**平均每题成本可降至 1/2.5**。
（注意：这些数字属于 sleep-time compute 这篇论文的独立实验，**不是**本文 agent memory 实验的结果，不可混用。）

## 4. 本仓库交付物索引

| 文件 | 内容 |
| --- | --- |
| [README.md](README.md) | 一页结论与文档索引 |
| [01-article-analysis.md](01-article-analysis.md) | 原文逐节详细解析（含全部数字与图号） |
| [02-design-recommendations.md](02-design-recommendations.md) | 对后续 agent memory 系统的设计建议 |
| [03-claims-and-evidence.md](03-claims-and-evidence.md) | 论断—证据对照、证据等级、缺口与可复现性清单 |
| [references.md](references.md) | 本页 |
| [data/figures.md](data/figures.md) | 原文 Figure 1–15 的图注与 CDN 地址索引（供核对本文图号引用） |
