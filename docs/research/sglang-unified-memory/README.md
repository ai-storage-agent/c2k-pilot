# SGLang《Unified Memory》精读与对我们工作的建议

> **对象：** LMSYS Org blog, *Unified Memory in SGLang: One Arena for Every Token Lifetime*（Cheng Wan 等，2026-11-11）— <https://www.lmsys.org/blog/2026-11-11-unified-memory>；配套官方文档 [Unified Memory for Hybrid Models](https://docs.sglang.io/docs/advanced_features/unified_memory) 与 [Unified Memory Design](https://docs.sglang.io/docs/advanced_features/unified_memory_design)。
> **交付物：** ① 文章逐节解析与证据核验；② 结合我们（DwarfStar/ds4、Strix Halo TP、SSD 流式与分层存储）公开工作的可施工建议。
> **撰写日期：** 2026-11-12。**语言：** 中文。

## 这是什么

这份文档把 LMSYS 这篇工程博客拆到"每一节讲了什么、依据是什么、数字是多少、结论的边界在哪里"，再把其中可迁移的机制整理成一套对**我们自己推理引擎**可施工的建议。

它不是原文翻译，而是"精读 + 工程化"。原文与官方文档中的每一条量化结论都保留出处（小节 / 表 / 图）；无法从公开材料确认的部分一律标注为**推断**或**未验证**。文末 [03](03-claims-and-evidence.md) 逐条给出证据等级。

## 文档索引

| 文档 | 回答的问题 |
| --- | --- |
| **[01-article-analysis.md](01-article-analysis.md)** | 原文逐节解析：问题、六个机制、全部数字、官方文档补充的边界与限制 |
| **[02-recommendations.md](02-recommendations.md)** | 结合我们工作的建议：对 ds4、对 Strix Halo/异构内存、对 SSD 流式与分层存储、评估方法与反模式 |
| **[03-claims-and-evidence.md](03-claims-and-evidence.md)** | 论断—证据对照表、证据等级、原文未给出的信息、可复现性缺口 |
| **[references.md](references.md)** | 全部引用与逐条核验记录（HTTP 状态、snapshot SHA） |
| [data/figures.md](data/figures.md) | Figure 1–6 的图注、SVG 地址与 `aria-label` 全文索引 |

**证据口径：** 本组文档区分三类来源——**原文事实**（同段标注小节/图表）、**官方配套材料**（SGLang 文档与已合入主干代码，标注 `[文档]` / `[代码]`）、**本文推断**（标注"推断"或 `[C]`）。原文自报的性能数字一律按"作者自报、未由我们复现"处理。

## 一页结论

**原文的核心命题：** 混合模型（full attention + sliding-window KV + recurrent state）的三种状态**生命周期不同、需求也不同步**。传统做法在启动时用 `--swa-full-tokens-ratio`、`--mamba-full-memory-ratio` 把显存切死，而正确的比例取决于你还不知道的流量；**统一内存把切分换成"一个 arena + 按需生长的 band + 惰性压实"**，让空闲字节归属真正需要它的状态类型。

**六个机制（本文按原文小节归并）：**

1. **一个 arena，无分区旋钮** —— full KV 从高端向下长、bounded state 从低端向上长，中间的浮空 band 可搬移；启动比例参数退化为 sizing 目标。
2. **每 token 一个 entry 的新 KV 布局** —— 同一 token 跨所有层的行打包进一个 entry，不同 shape/dtype 可共处；投机 draft 的行与 DSA indexer key 因此能和 target KV 共用分配与生命周期。
3. **多种分配几何共存** —— arena 是字节区域而非同构页数组；state slot 可比 KV page 大很多，naive 共享会把空闲容量困在无法使用的缝隙里。
4. **端到端一套需求模型** —— admission、memory clip、HiCache load-back、PD 预分配、前缀缓存淘汰都问同一个 allocator"整个 demand 放不放得下"，并按需做三级重排（no move / compact ends / relayout）。
5. **调度器感知的页生命周期** —— 逻辑释放立即、物理复用等待；`req_to_token` 只存虚拟 id，搬页只改映射不改请求表；四状态（beyond frontier / hole / live / pending）+ 两种源保护（vacated / fenced）。
6. **三个接口收口** —— 模型声明状态（一个 plan 建 arena）、所有容量问题问同一 allocator、每个页使用者登记 ledger；新 feature 通过声明加入，而不是自带同步。

**原文最有分量的结论（按证据强度排序）：**

| 结论 | 原文证据 | 强度 |
| --- | --- | --- |
| **默认配置下无回退** | Qwen3.5-4B，1,024 in / 256 out、并发 64：统一内存 5,830 vs 分池 5,880 output tok/s；GSM8K 双方均 0.875（200 题） | 强（同机同模型直接对照） |
| **错误的启动比例代价很大** | GPT-OSS-20B 上 `--swa-full-tokens-ratio 0.1` 相对默认损失 12% 吞吐（7,910 vs 9,030）；Qwen3.5-4B 上 `--mamba-full-memory-ratio 0.3` 把并发压到 24（默认 51），损失 14% | 强（同 benchmark 内对照） |
| **不用猜比例就能多装请求** | 同 GPT-OSS-20B 负载：统一内存约 1,000 并发 vs 默认比例 618，吞吐 +14%，TTFT 6 s vs 43 s；Qwen3.5-4B 16K/4,096、并发 64：32 vs 22 请求，快 26% | 强（同 benchmark 内对照，作者自报） |
| **更少 retraction，且不靠限流** | Qwen3.5-4B 512 in / 16,384 out、并发 51：统一内存每 1,000 完成请求 retract 约 233 次，默认 294 次；`mamba-full-memory-ratio 0.3` 虽 0 次 retract，但只因把并发压到 24，且慢 20%（3,620 vs 4,530 tok/s） | 中—强（同 benchmark 内对照，未给方差） |

**最容易被忽略的两个结论：**

- **"无回退"只在两种模型、单机单卡、默认比例上验证过。** 原文自己写明 unified memory 仍是 experimental、目标是将来成为默认内存系统，且**只覆盖混合模型**：纯 full-attention、带 sliding-window 的 MLA、DeepSeek-V4 都"不支持、启动即拒绝"。把"默认无回退"当成"可以无脑上生产"是过度外推。
- **收益来自"容量可换手"，而不是某种更快的算子。** 所有胜出场景的共性是**负载与启动时假设不符**；对比例猜得准的固定工作负载，收益主要退化为"少配置一个参数"。这决定了我们的采用顺序：先用它去掉调参风险，再用它做容量规划，而不要指望白拿吞吐。

**给我们的一句话建议：** 值得学的不是 SGLang 的某个参数，而是它把**"多种生命周期不同的状态共用一个内存池"**做成了**一条可验证的不变量链**——统一的需求模型、显式页状态、以及"逻辑进展驱动决策、各 rank/各 stage 决策一致"的设计。我们（ds4 的 slot/KV/专家缓存、Strix Halo 的统一内存与 SSD 分层）正面临同一类问题，建议按 [02](02-recommendations.md) 的优先级采用其**方法论**而非其代码。
