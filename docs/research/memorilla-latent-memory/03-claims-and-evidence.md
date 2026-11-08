# 03 · 论断—证据对照、缺口与可复现性

> 本页做三件事：把全文的关键论断逐条对上证据等级；列出**原文没有给出**的信息；记录本次核对发现的**文档不一致**与口径陷阱。
> 等级定义：**E1** 单案例 / 单次运行；**E2** 同 benchmark 内对照（无置信区间）；**E3** 规模曲线或多档消融（仍无 CI）；**E4** 可核实的官方事实（代码/配置/模型卡/数据卡）；**E5** 第三方报告数字或未独立验证的引用。

## 1. 论断—证据对照表

| # | 论断 | 证据 | 等级 | 边界/限定 |
| --- | --- | --- | --- | --- |
| C1 | 固定 16 个 query-conditioned 隐 token 可以在多个 benchmark 上超过 full context | FactKG 84.33 vs 80.43（Table 11）；全上下文看到全部 1,727 token | **E2** | 单模型族（Qwen3）；单次运行；无 CI |
| C2 | 隐记忆与 RAG 的错题互补 | FactKG 15.9%/10.0% 独占；8 个 benchmark 的 oracle union 均高于任一方法（Figure 5） | **E2** | union 是 **oracle 上界**，非实测混合系统；ROUGE 类任务用阈值 max(0.20, median) 定义"答对" |
| C3 | 压缩吃关系、检索吃字面 | NarrativeQA why +4.91 / how +7.02、who −3.45 / which −2.93（Figure 4a）；FactKG 领先随实体数 +4.23pp→+7.59pp（Figure 4b） | **E2/E3** | 原文自己提示题型与答案长度、实体频率混淆 |
| C4 | 全上下文不是上界 | Table 11 的 21 个指标中 20 个落后；RAG-50 在 15 个上超过全上下文 | **E2** | 依赖服务栈与 YaRN 设置；21 个指标含不同量纲 |
| C5 | 增益来自 query conditioning 而非参数量或文档交互 | 噪声替换后 documents-only +0.04，MEMORILLA −5.93（§E.1） | **E2** | 只在 PMv2/FactKG 上做；单次运行 |
| C6 | query-independent 表示无法靠加参数弥补 | segmented parameter-matched 31.10 vs 44.04（Table 13） | **E2** | 从零训练，绝对值不可与 Table 11 混用 |
| C7 | 更大编码器（同族 4B→8B）影响很小 | 每项 ≤1.3，PubMedQA +3.00（=100 题中 3 题）（§E.5） | **E3** | 单次运行；PubMedQA n=100 |
| C8 | 隐记忆胜过同预算的 LoRA 适配 | 每个主指标领先（PubMedQA/LaMP-7 在噪声内）（§E.4、Figure 11） | **E2** | LoRA 无文档输入，对比的是"证据 vs 适配" |
| C9 | 读路径成本随集合增长保持平坦 | N=1→512：740→739 ms；记忆模块 forward −0.06 ms（Table 14） | **E2/E3** | 用 HF `generate`、无 paged KV cache；单卡、batch 1、250-token 文档 |
| C10 | store 比对应 KV cache 小 7,266× | PV4：50,455 token × 144 KiB ≈ 6.9 GiB vs 200×2,560 bf16（§F） | **E1** | 单场景；144 KiB/token 是 Qwen3-8B bf16 的假设值 |
| C11 | 每文档存储 5 KB、与集合大小无关 | Table 14 "Storage per document 5 KB / 5 KB / flat" | **E2** | 2,560 维 bf16 的理论值 |
| C12 | RL 只训记忆模块即可提升冻结 agent | TextWorld avg@3 0.186→0.242、pass@3 0.250→0.375（Figure 8） | **E2** | 40 局小样本、单游戏套件、≤50 回合、回合上限效应强 |
| C13 | 未训练记忆**低于** ICL，增益来自学习 | 0.153 vs 0.186（avg@3）、0.225 vs 0.250（pass@3） | **E2** | 小样本 |
| C14 | 桌面变化主要是"终止/脱离循环"而非解题率 | 预算耗尽 71%→58%、提前结束 29%→42%（Figure 8、§6.2） | **E2** | 轨迹抽查为定性证据 |
| C15 | K=16 是合适的训练容量 | K=16 vs K=128 从头训练：4/8 benchmark <1 点，PMv2/PV4 下降（Figure 9） | **E3** | 从零训练；4B decoder |
| C16 | 推理时预算要点"最后几个槽"才够 | PMv2 K=4 前近 closed-book、K=16 到 44.60（Figure 10） | **E3** | 是"从 16 槽 checkpoint 截断"，不等价于训练 K 个 |
| C17 | 训练三段式课程有效 | 无消融单独验证每一段（只有 Recipe 表与描述） | **E5** | **原文未做跳过某段的对照** |
| C18 | 记忆模块可跨任务共享一个 checkpoint | Table 5：Stage 3 共享多任务 checkpoint，仅 PV4/PMv2 额外微调 | **E4** | 见 §3.4 的文档不一致 |
| C19 | 编辑路径成本与检索索引共享 | "encoding adds no cost over retrieval"（§2） | **E4/E5** | 属设计论证，无独立对照实验 |
| C20 | 需要开放权重、每模型一套记忆模块 | 记忆写入 LLM **输入 embedding**空间 | **E4** | 直接由架构推出 |
| C21 | 会丢精确细粒度信息 | NarrativeQA who/which 落后；Limitations 自陈 | **E2** | 原因归为"encoder 未为压缩训练"是原文的**推测** |
| C22 | 跨模型族与多模态未验证 | Limitations 明说 | **E4** | 原文自陈 |
| C23 | embedding 删除可不重训，但仍可能编码敏感信息 | Ethics statement | **E4** | 属声明，无实验验证 |
| C24 | PersonalizationV4 是合成数据、无真实用户、同一机器模板 | Ethics + HF 数据卡 | **E4** | 可核实 |
| C25 | 平均分 49.68 | 8 个 benchmark 主指标直接求均值 | **E2** | **混合量纲**，只能横向比方法（见 §3.2） |
| C26 | 代码/数据/checkpoint 已发布 | GitHub 仓库、HF 模型卡、HF 数据卡均可访问 | **E4** | 本次抓取核验（见 [references](references.md)） |

## 2. 关键数字复核（本次逐项回算）

**压缩倍数（Table 10 → Table 11 的 Compression 列）：** 用几何平均 full context 6,301 ÷ 16 = **393.8 ≈ 394×**，与原文一致；逐项：

| benchmark | Full Context token/q | ÷16 | 原文列值 |
| --- | --- | --- | --- |
| PMv2 | 31,587 | 1,974.2 | 1,974× ✓ |
| PV4 | 50,455 | 3,153.4 | 3,153× ✓ |
| PubMedQA | 324 | 20.25 | 20× ✓ |
| NarrativeQA | 67,385 | 4,211.6 | 4,212× ✓ |
| TriviaQA | 11,888 | 743.0 | 743× ✓ |
| FactKG | 1,727 | 107.9 | 108× ✓ |
| LaMP-4 | 7,580 | 473.8 | 474× ✓ |
| LaMP-7 | 459 | 28.7 | 29× ✓ |

**文档 token 几何平均：** RAG-50 1,808 ÷ 16 = **113×**、MemoRAG 784 ÷ 16 = **49×**，与原文 "394×, 113× and 49×" 一致。

**"21 个指标里 20 个"复核：** Table 11 行数为 PMv2 1 + PV4 2 + PubMedQA 1 + NarrativeQA 4 + TriviaQA 4 + FactKG 1 + LaMP-4 4 + LaMP-7 4 = **21** ✓。全上下文唯一领先 MEMORILLA 的是 PubMedQA（67.00 vs 59.00）✓。

**错题互补的数字自洽性：** FactKG `15.9%（仅 MEMORILLA）+ 10.0%（仅 RAG）` 与准确率一致（84.33 + 10.0 ≈ 94.3 = "Either method"）✓；PMv2 `44.60 + 9.2 ≈ 53.8`（union）✓。

## 3. 原文没有给出的信息（缺口清单）

| 缺口 | 影响 | 原文是否承认 |
| --- | --- | --- |
| **置信区间 / 显著性检验** | 多个方法差距在 1–3 个点内（BLEU/ROUGE 尤为敏感），无法判断是否噪声 | 只提"bfloat16 与 vLLM 批处理会让分数波动几十分之一到约 1 个点"（[代码] `docs/evaluation.md`） |
| **每 benchmark 的运行次数 / 多种子** | 所有监督评测 seed 固定（23）、greedy；TextWorld 用 3 个样本 @T=0.6 | seed 给出，但无多种子方差 |
| **统计功效** | TriviaQA n=500、PubMedQA n=100、TextWorld 30 局；小样本上的名次不稳定 | 未讨论 |
| **成本模型（美元/GPU 秒）** | 只报 token 与延迟，未报端到端 TCO（含训练 19h×4 GPU 与 320 GiB 数据） | 训练时长在代码文档中给出，论文未做 TCO |
| **写入路径的工程质量** | 5 KB/文档是理论存储，未给出索引更新、并发、版本化的设计 | 未涉及 |
| **幻觉 / 误用的风险分析** | 隐 token 不可逐条审计，下游 LLM 是否会把压缩内容当事实、错误如何传播 | 完全未涉及 |
| **跨模型族迁移** | 明确列为未测 | 承认 |
| **多模态** | 只作为展望 | 承认 |
| **课程各段必要性的消融** | 无法判断 Stage 1/2 各自贡献 | 未做 |
| **encoder 专用压缩训练** | 只列为"最近的下一步" | 承认 |
| **隐私删除的实测** | 只声明"可不重训删除"，未给实验 | 未做 |

## 3.1 口径陷阱（引用时必须带）

1. **49.68 是混合量纲的平均。** accuracy、EM、ROUGE-L 直接求均值；主页原文自己标注 "The reported mean combines different metrics." 只能用于表内横向比较。
2. **Figure 5 的 union 是 oracle 上界。** 原文明确 "oracle union, not an evaluated hybrid system"；不能当作已实现系统的性能。
3. **LaMP-4 / LaMP-7 用 dev split**，不是 test；TriviaQA 用 n=500 验证子集；PubMedQA 用 900/100 派生划分。跨论文比较时需注意。
4. **two personalization benchmark 额外微调**，其余用共享 checkpoint；横向比较时这是不对等条件（原文明确说明）。
5. **Table 13 的消融从零训练**，绝对值**不可**与 Table 11 混用（原文明确警告）。
6. **推理预算曲线（Figure 10）不等于训练容量**（原文明确）。
7. **主文的 4,212× / 108× / 743× 等是单 benchmark**，与"几何平均 394×"是不同统计量。

## 3.2 描述与数字的口径不一致（核对发现）

| 位置 | 一处说法 | 另一处说法 | 本文处理 |
| --- | --- | --- | --- |
| 主页 hero | "Over 4,000× … **without sacrificing performance**" | 同页结果表显示 PubMedQA 59.00 vs 69.00、PV4 66.65 vs 67.88、NarrativeQA ROUGE-L 19.31 vs 20.51 | 视为"平均意义"的表述；正文以逐 benchmark 表为准 |
| 主页个性化示例 | 标注为 "A **PersonalizationV4** example. MEMORILLA connects the request to an earlier mention of iron deficiency…" | 论文 Figure 6 把**同一描写**（缺铁性贫血历史）标为 "Personalization Case Study. On **PersonaMem-v2**…" | **记录为不一致**；本文在涉及该案例时同时标注两处口径 |
| README 与 HF 模型卡的 checkpoint 表 | 二者的 `pv4/`、`pmv2/` 都标 "from **Stage 1**"、recipe 写 `single_task.yaml` | 两处都与实际不符：(a) `configs/single_task.yaml` 的 `init_memory: runs/stage2/epoch-00`（Stage 2，非 Stage 1）；(b) `configs/personalization_pv4.yaml` / `personalization_pmv2.yaml` 实写 `init_memory: runs/stage3/epoch-04`；`docs/training.md` 说 "Personalisation continues the last **Stage 3** epoch"；论文 §2.6/Table 5 也说 Stage 3 之后再微调 | 判定 **README 与模型卡的该表均过期**，以 `configs/` 与论文为准（见 §3.4） |
| 论文 §4 文字 | "leads on five and **and** is second on NarrativeQA and PV4" | 拼写重复（原文笔误） | 不在正文复现 |
| arXiv 版本 | v1 2026-10-15、v2 10-27、v3 11-03，三版体积相同 | 本文数字跨 v1/v3 抽查一致 | 以 v3 复核、以 v1 HTML 引用图表 |

## 3.3 与仓库既有调研的数字口径差异（不构成冲突）

本仓库另一份 Anthropic《components of agent memory》精读（`docs/research/agent-memory/`，见 [PR #9](https://github.com/ai-storage-agent/c2k-pilot/pull/9)，尚未合并）中的 13%→48%、53/54/61%、87/73% 等数字属于**另一篇博客的独立实验**，与本文 MEMORILLA 的数字**量纲与任务均不同**，两份文档的数字不得互相引用为佐证。

## 3.4 可复现性清单

**具备（可复现）：**
- 架构与四步流程（论文 §2）、训练目标（§2.4）、三段式课程（§2.6）
- 超参与分块（Table 2/3/4/5）、数据规模（Table 1）
- 每个 baseline 的实现细节（Appendix C，含 Mem0/MemoRAG 配置表）
- benchmark 定义、评测口径、context budget（Appendix D，Table 7/10）
- TextWorld RL 全部配置（Appendix G，Table 15，含 GRPO 超参）
- **代码**（Apache-2.0，GitHub `snap-stanford/memorilla`）
- **checkpoint**（HF `memorilla/Memorilla-Qwen3-8B`，5 个 memory.pt，各 194M 参数）
- **数据 + 预计算 embedding**（HF `memorilla/Memorilla-Data`，约 320 GiB）
- **PersonalizationV4**（HF `memorilla/PersonalizationV4`，CC BY 4.0，含 raw 中间产物）
- 评测脚本与 baseline 脚本（`scripts/`）

**不具备（不可复现或需重做）：**
- 逐次运行的原始日志与 predictions（论文未附；需自行跑 `evaluate.py` 生成）
- 多种子方差 / 置信区间
- Figure 1–13 的绘图数据表（图只有 PNG/SVG，无 CSV）
- 训练过程曲线（`metrics.csv` 需自跑）
- PV4 生成所用**模型快照标识**（数据卡给出 persona 种子 `raw/persona_seeds.csv`、答案乱序 `random.Random(42)`、划分 `numpy.random.default_rng(23)` 与完整 pipeline，但未记录 GPT-5 / 5.1 / 5-mini 的具体版本快照，端到端逐字节复现因此不能保证）

**算力门槛（[A-代码] `docs/training.md`）：** Linux + CUDA + Python 3.11 + H100 80GB（recipe 均按 4 卡配置；FactKG 单卡）；Stage 1/2/3 约 6/4/9 小时；数据下载约 27/60/223 GiB；需 FlashAttention-2（评测不需要）。个人复现的最小路径是**只评测已发布 checkpoint**（单卡、约 15 分钟 / 全 benchmark、约 11 GiB 数据）。
