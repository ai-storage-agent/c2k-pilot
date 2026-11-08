# data · 图形与表格索引

> 本页把**主页交互图形**与**论文 Figure/Table** 编号对齐，便于核对 [01-article-analysis.md](../01-article-analysis.md) 中的图表引用。
> 论文图片路径均为 `https://arxiv.org/html/2610.21375v1/figures/...`（2026-11-08 核验 200）。主页图形为内联 SVG，无独立文件；文中给出的 SVG 坐标为从主页 HTML 提取。

## 1. 主页（memory.stanford.edu）

| 区块 | 形式 | 内容要点 | 与论文的对应 |
| --- | --- | --- | --- |
| Hero | 静态 | "Over 4,000× document-token compression"、"27× lower latency"、16 memory tokens | Figure 1、Table 11 |
| 1 / Memory walkthrough | 10 步播放（JS chunk `3iauhmowglj5r.js`） | 3 段会话（3 月 3 日缺铁性贫血 / 4 月 18 日半马计划 / 6 月 2 日日常能量）；每步 `stage` ∈ {talk, store, ask, read, answer}；16 槽注意力权重为**硬编码示意数组**（`p=[.87,.76,…]`） | §2 方法流程；主页自己标注"Attention weights are illustrative, not measured" |
| 2 / RAG and MEMORILLA side by side | 6 步播放 | 同一问题的 RAG（top-3 文本）vs MEMORILLA（16 隐 token）对照；token 数 Full context 67,385 / RAG-50 3,612 / MEMORILLA 16；延迟 19.9 s vs 0.74 s | Table 10、Table 14 |
| 3 / A two-hop claim | 4 步播放 | FactKG 实例 claim + 27 条三元组；RAG-50 判 False（78.4% 全量）vs MEMORILLA 判 True（84.3% 全量） | §4 "Relational evidence"、Table 11 |
| 4 / Memory for agents | 19 步播放 | TextWorld 示意回放；full-history vs +8 memory tokens | Figure 7、Figure 8 |
| Results 区图形 | 内联 SVG | 8 benchmark Pareto frontier（对应 `figures/frontier.svg`）；FactKG 实体数 / 组合事实数分解；oracle union 条形图 | Figure 1、Figure 3、Figure 4、Figure 5 |

**主页图表数值速查（用于核对正文）：**

| 图中系列 | 1 | 2 | 3 | 4+ |
| --- | --- | --- | --- | --- |
| FactKG · 实体数（MEMORILLA / RAG-50） | 85.7 / 81.5（n=1,299） | 83.1 / 77.7（n=3,502） | 83.8 / 77.3（n=2,764） | 87.1 / 79.5（n=1,476） |
| FactKG · 组合事实数（MEMORILLA / RAG-50） | 89.2 / 78.7（n=1,058） | 87.4 / 66.9（n=1,126） | 80.8 / 61.7（n=731） | 85.8 / 51.8（n=456） |

（论文正文写作 "RAG-50 drops from 78.73 to 51.75"、"advantage grows … from +4.23pp at 1 entity to +7.59pp at 4+"；换算：81.5−77.3=4.2、87.1−79.5=7.6，与正文一致。）

**Oracle union 条形图数值（主页）：**

| benchmark | RAG-50 | MEMORILLA | Either method |
| --- | --- | --- | --- |
| FactKG | 78.4 | 84.3 | 94.3 |
| PV4 | 65.8 | 66.6 | 80.4 |
| PubMedQA | 67.0 | 59.0 | 80.0 |
| TriviaQA | 55.6 | 57.0 | 74.2 |
| LaMP-7 † | 37.2 | 50.1 | 56.1 |
| NarrativeQA † | 32.1 | 37.9 | 54.3 |
| PMv2 | 26.7 | 44.6 | 53.8 |
| LaMP-4 † | 26.6 | 37.2 | 46.6 |

† 判定阈值 = max(0.20, MEMORILLA 中位数)（论文 Figure 5 注）。

## 2. 论文 Figure

| 编号 | 图注要点 | 文件（v1 HTML 相对路径） |
| --- | --- | --- |
| Figure 1 | Performance versus context length：8 benchmark 平均分 vs 文档 token 几何平均；MEMORILLA 在 Pareto frontier、16 token、比 full context 少 394× | `figures/results/fig1_frontier.png` |
| Figure 2 | Memorilla architecture：冻结 encoder 编码一次；K 个 query-conditioned 槽 attend store 并投影为 memory readout | （HTML 内嵌；`assets/architecture.png` 仓库同款） |
| Figure 3(a)–(h) | Per-benchmark performance vs context length（FactKG / TriviaQA / PMv2 / LaMP-7 / LaMP-4 / NQA / PV4 / PubMedQA）；每个 benchmark 都在 Pareto frontier，领跑 5 个 | `figures/results/ctx_{factkg,triviaqa,pmv2,lamp7,lamp4,narrativeqa,pv4,pubmedqa}.png` |
| Figure 4(a)–(c) | Per-question breakdown vs RAG-50：NQA 按题型；FactKG 按实体数；FactKG 按组合事实数 | `figures/results/nqa_qtype.png`、`factkg_entities.png`、`factkg_composition.png` |
| Figure 5 | Per-question complementarity：各自独占答对比例 + oracle union（每个 benchmark 的 union 都高于任一方法） | `figures/results/complementarity.png` |
| Figure 6 | Personalization case study：PMv2 上利用用户缺铁性贫血历史（与问题无词汇重叠） | 正文内嵌（论文 HTML 中为第 15 个 figure 区块） |
| Figure 7 | Reinforcement-learned memory on TextWorld：(a) 流程；(b) ICL 绕圈；(c) MEMORILLA 到达目标 | `assets/textworld_overview.png`（仓库） |
| Figure 8 | TextWorld 结果（avg@3、pass@3、terminal episodes） | `figures/results/textworld_results.png` |
| Figure 9 | Memory-token capacity：K=16 vs K=128 从头训练 | `figures/results/ablation_k_capacity.png` |
| Figure 10(a)–(h) | Memory token budget at inference：不重训、取前 K 槽 | `figures/results/kbudget/{factkg,triviaqa,pmv2,lamp7,lamp4,narrativeqa,pv4,pubmedqa}.png` |
| Figure 11 | Memory vs comparable-budget LoRA adaptation | `figures/results/ablation_lora.png` |
| Figure 12 | Encoder size：Qwen3-Embedding-4B vs 8B | `figures/results/ablation_encoder.png` |
| Figure 13 | 一个 TextWorld prompt 实例（8 个 memory 向量置于 system prompt 之前） | 正文内嵌示例 |

## 3. 论文 Table

| 编号 | 内容 | 在 [01](../01-article-analysis.md) 中的位置 |
| --- | --- | --- |
| Table 1 | 训练数据集与规模（EnWiki 1,979,809；10 源合计 1,343,993） | §3.5 |
| Table 2 | 每 benchmark 的文档分块单位与 token 数 | §4.1 |
| Table 3 | 模型配置（K=16、8 heads、2 cross-attn、134M/194M 参数） | §3.2 |
| Table 4 | 三段式课程超参 | §3.5 |
| Table 5 | 下游训练与评测细节 | §3.5 |
| Table 6 | Mem0 / MemoRAG 配置 | §4.2 |
| Table 7 | 8 个 benchmark 概览（docs/q、tok/q、划分大小） | §4.1 |
| Table 8 | 一个 held-out PV4 用户走完五步 pipeline 的示例 | §9（PV4 示例） |
| Table 9 | 问题生成指令（逐字摘录） | §9 |
| Table 10 | 每 query 的文档 token（8 方法 × 8 benchmark + 几何平均） | §5、§8 |
| Table 11 | 主结果（21 个指标全表，含 Compression 列） | §5 |
| Table 12 | 与 ComMer 的对比（LaMP-4 / LaMP-7 ROUGE-L） | §7.4 |
| Table 13 | 记忆架构消融（PMv2 SA） | §7.1 |
| Table 14 | Serving cost as the collection grows（N=1 vs N=512） | §8 |
| Table 15 | TextWorld RL 完整配置 | §6 |

## 4. 主页 / 论文 / 仓库三方一致性速查

| 数字 | 主页 | 论文 | 仓库/模型卡 |
| --- | --- | --- | --- |
| 记忆槽 K（监督） | 16 | 16（§2.5、Table 3） | 16（`DEFAULT_NUM_MEMORIES = 16`） |
| 记忆槽 K（TextWorld） | 8（"8 memory tokens"） | 8（§6） | 8（Table 15） |
| 可训练参数（8B decoder） | 未列 | 194,123,776 | "194M parameters"（模型卡） |
| 编码器 / 解码器 | 未列 | Qwen3-Embedding-4B / Qwen3-8B | 同（模型卡 base_model 字段） |
| Full context → MEMORILLA 压缩（NarrativeQA） | 4,212× | 4,212×（Table 11） | 未列 |
| 延迟（512 docs） | 0.74 s vs 19.9 s | 739 ms vs 19,932 ms（Table 14） | 未列 |
| 模型许可 | 未列 | — | Apache-2.0（模型卡/仓库）；PV4 数据 CC BY 4.0 |
