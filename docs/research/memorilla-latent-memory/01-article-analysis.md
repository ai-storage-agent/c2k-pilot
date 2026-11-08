# 01 · 原文逐节详细解析

> **对象：** `https://memory.stanford.edu/`（MEMORILLA 项目主页）＋论文 *Memorilla: Latent Semantic Memory for LLMs*（arXiv:2610.21375）。
> **来源核验：** 主页 HTML、论文 arXiv HTML（v1 正文 + v3 复核）、GitHub 仓库、HF 模型卡与数据卡均直连抓取核验，见 [references.md](references.md)。
> 本页按主页与论文顺序逐节拆解；数字、引文与图表编号均来自原文，凡本文的推断都会显式标注"**推断**"。

## 1. 元信息与定位

| 项 | 内容 |
| --- | --- |
| 项目名 | MEMORILLA（主页顶栏与标题） |
| 主页标题 | *MEMORILLA: Latent Semantic Memory for LLMs* |
| 论文 | *Memorilla: Latent Semantic Memory for LLMs*，arXiv:2610.21375 |
| 论文版本 | v1 2026-10-15、v2 2026-10-27、v3 2026-11-03（三版页数/体积相同，均为 3,660 KB；本页数字跨 v1/v3 复核一致） |
| 作者 | Adibvafa Fallahpour\*、Parsa Idehpour\*、Vignesh Kothapalli\*、Nikita Mounier、Shirley Wu、Shayan Pardis、Jure Leskovec（\* 同等贡献，按字母序） |
| 单位 | Stanford University（主页另列 University of Toronto、University of Pennsylvania、MIT、Vector Institute、Arc Institute） |
| 发表 | COLM Workshop on *Context Beyond the Window: Persistent Knowledge in Language Models*（据论文 BibTeX 与 HF 模型卡） |
| 学科 | cs.LG；cs.AI |
| 许可 | 论文 CC BY 4.0；代码 Apache-2.0；PersonalizationV4 数据 CC BY 4.0；Memorilla-Data 逐 config 继承源数据集许可 |
| 性质 | **系统性论文 + 可复现代码 + 已发布 checkpoint**（不是纯工程博客，也不是只有网站的产品页） |
| 主页一句话定位 | "A learned memory that reads an entire document collection and supplies a frozen LLM with a compact set of query-dependent memory tokens." |

**主页的关键数字（都带原文标注的口径）：**

| 主页宣称 | 口径（主页原文） |
| --- | --- |
| **Over 4,000× document-token compression without sacrificing performance** | NarrativeQA，相对 full context；"Supervised Qwen3-8B experiments. Compression excludes queries and shared instructions." |
| **Measured 27× lower end-to-end latency** | 512 documents · 0.74 s vs 19.9 s；one H100-80GB、batch size 1、full context 用 YaRN |
| 16 memory tokens | 监督实验中默认预算 |
| **Up to 4,212× fewer tokens than full context**（RAG 对照区块的标题） | NarrativeQA 上 full context 67,385 tokens vs MEMORILLA 16 tokens；主页注明"NarrativeQA has the largest gap" |

> **口径提醒（本文推断）：** hero 的 "without sacrificing performance" 是**平均意义**的说法。同一页面自己的结果表就显示 MEMORILLA 在 PubMedQA（59.00 vs 69.00）、PV4（66.65 vs 67.88）、NarrativeQA ROUGE-L（19.31 vs 20.51）上**不是第一**。见 [03 §3](03-claims-and-evidence.md)。

## 2. 主页叙事：为什么需要它

主页的 motivation 段落把问题拆成三条：

1. **LLM 的知识在训练结束时固定，而它服务的世界一直在变。** 用户偏好跨月累积、新发现推翻旧结论、agent 犯过的错需要记住不再重犯；为每次变化重训不现实，冻结模型一旦文本离开上下文窗口就"忘了"。
2. **一个问题真正需要什么，事先几乎无法知道。** 主页的例子：一个"哪些食物补充能量"的请求，可能取决于几个月前用**完全不同的措辞**提到的缺铁（iron deficiency）。
3. **两种朴素做法都不够。** "全都塞进上下文"昂贵且常常把关键信息埋掉；"检索"则会漏掉与问题**只有弱相似度**的信息。

**主页给出的四条设计需求（原文小标题，本文直译）：**

| # | 需求 | 原文含义 | 工程含义 |
| --- | --- | --- | --- |
| 1 | **Collection-wide access** | 每个 query 读整个集合 | 不做离散 top-k 预选，避免"选择即上限" |
| 2 | **Query-dependent recall** | 记忆返回什么取决于问题 | 同一套存储服务多种请求；不能一次压缩后对所有问题用同一表示 |
| 3 | **A fixed token budget** | 无论集合多大，模型收到同样几个 token | 上下文长度与集合规模解耦 |
| 4 | **Reusable document embeddings** | 每篇文档编码一次，store 增长不重编码过去 | 写路径与稠密检索索引**共享**，不额外付一遍编码成本 |

这四条需求直接决定后面架构的取舍：需求 2 排除 query-independent 压缩（ICAE/AutoCompressors 一路）；需求 3 排除文本检索与 compaction；需求 4 要求 encoder 冻结且与 LLM 解耦。

## 3. 方法：一个 query-conditioned 的隐记忆接口

正文第 2 节把系统分成**编码、存储、检索**三个操作。给定 N 个文档块 $\mathcal{D}=\{d_1,\dots,d_N\}$：

### 3.1 编码与持久存储（§2.1）

- **冻结的文档 encoder** $f^{d}_{\mathrm{enc}}$ 把每块 $d_i$ 映射为 $\mathbf{z}_i$，堆叠成 query-independent 的 store $\mathbf{Z}_{\mathcal{D}}\in\mathbb{R}^{N\times h_e}$。
- 因为 $\mathbf{Z}_{\mathcal{D}}$ 不含 query，**算一次就持久化**（内存或二级存储），后续 query 复用，只有新增/修改的文档需要重编码。
- **冻结的 query encoder** $f^{q}_{\mathrm{enc}}$ 把 query $q$ 映射为 $\mathbf{z}_q$；它**不当作长期记忆存储**。

**具体实例（§2.5）：** 文档与 query encoder 都是 **Qwen3-Embedding-4B**（$h_e=2560$，每文档 mean-pool）；decoder 是 **Qwen3-8B**（$h_L=4096$）。这套配置下 **194,123,776** 个可训练参数（4B decoder 版本为 190,190,080）。

### 3.2 查询条件化检索 $f_{\text{mem}}$（§2.2，四步）

$$f_{\text{mem}}:\left(\mathbf{Z}_{\mathcal{D}},\mathbf{z}_q\right)\mapsto\mathbf{M}\in\mathbb{R}^{K\times h_L}$$

**第 1 步 · Memory slot 初始化。** $K$ 个记忆槽初始化为**跨集合、跨 query 共享**的可学习向量 $\mathbf{Q}_0\in\mathbb{R}^{K\times h_e}$。不同的初始值定义了固定输出预算，同时让不同槽可以承载不同信息。（FactKG 变体用 `retrieval_init`：槽从与 claim 最相似的文档初始化——[代码] `configs/factkg.yaml`。）

**第 2 步 · Query conditioning。** 槽对 query embedding 做 cross-attention 并残差 + LayerNorm：

$$\mathbf{Q}_c=\mathrm{LayerNorm}\!\left(\mathbf{Q}_0+\mathrm{CrossAttn}(Q{=}\mathbf{Q}_0,K{=}\mathbf{z}_q,V{=}\mathbf{z}_q)\right)$$

由于 query 只有一个向量，它给**所有槽一个共享更新**；残差连接保留了 $\mathbf{Q}_0$ 之间的差异，因此 $\mathbf{Q}_c$ **既被 query 条件化又保留各槽身份**。

**第 3 步 · 文档检索。** 条件化后的槽通过 $L_{\text{ref}}$ 个 cross-attention 块（Perceiver 式 latent array）读**每一个**文档 embedding，每块含 cross-attention + FFN，均为 pre-norm + 残差。原文强调：这不是离散 top-$k$ 选择，而是**对全部存储文档的连续、query-conditioned 读取**。

**第 4 步 · 投影到 LLM embedding 空间。** 学习一个线性投影 $\mathbf{W}_{\text{proj}}\in\mathbb{R}^{h_e\times h_L}$，得到 $K$ 个"soft memory tokens"。

**默认超参（Table 3 + [代码] `memorilla/memory.py`）：**

| 组件 | 取值 |
| --- | --- |
| Pooling | 对文档的 adaptive cross-attention（softmax over documents） |
| 记忆槽 $K$ | **16** |
| Cross-attention 层 | **2** 层（slots ← documents） |
| 自注意力层 | 监督设置 **0 层**（代码默认 `DEFAULT_NUM_SELF_ATTN_LAYERS = 0`）；RL 设置加 1 层 |
| Attention heads | 8 |
| Encoder 侧维度 | 2560 |
| Decoder 侧维度 | 2560（4B decoder）/ 4096（8B decoder） |
| 槽初始化 | Xavier uniform |
| 正则 | Dropout 0.1 + 残差 cross-attention |
| 可训练参数 | 190,190,080（4B）/ 194,123,776（8B） |

### 3.3 注入冻结 LLM（§2.3）

LLM 的输入 embedding 层把文本 query 映射为 $\mathbf{P}_q$，最终输入为

$$\mathbf{X}_{\text{LLM}}=[\underbrace{\mathbf{m}_1,\dots,\mathbf{m}_K}_{\text{soft memory tokens}};\mathbf{P}_q]$$

因为 $\mathbf{m}_k$ 与文本 token embedding **同维度**，LLM 在同一条输入序列里同时处理记忆与文本；**不改任何 LLM 层或注意力机制**，RoPE 照常施加在拼接后的序列上。

### 3.4 监督目标（§2.4）

$$\mathcal{L}_{\mathrm{sup}}=-\sum_{i=1}^{L}\log P\!\left(y_i\mid\mathbf{y}_{<i},\mathbf{X}_{\text{LLM}};\bm{\theta}_{\text{mem}}\right)$$

$\bm{\theta}_{\text{mem}}$ 只含记忆模块与其投影；**损失只算 answer token**，不算 prompt 与记忆位置。

### 3.5 三段式课程（§2.6，Table 4/5）

| 阶段 | 数据 | 目标 | 峰值 LR | epoch |
| --- | --- | --- | --- | --- |
| **Stage 1** EnWiki pretrain | **1,979,809** 条英文维基复述重建（约 2M，约 128 token/块，平均 1.73 docs/row） | 在固定预算下保住足够信息，让冻结 LLM 能复述 | 3e-4 | 1 |
| **Stage 2** Multi-task pretrain | **1,343,993** 条，10 个数据集（阅读理解 / 开放域 QA / 摘要） | 学会从同类存储中召回不同信息 | 3e-4 | 1 |
| **Stage 3** Downstream fine-tune | 8 个评测 benchmark 训练集统一混合 | 下游多任务 | 1e-4 | 5 |

Stage 2 的 10 个数据集与规模（Table 1）：SQuAD v2 86,821、DROP 77,400、CoQA 108,647、PubMedQA 900、QuAIL 10,246、PwC 241,564、CNN/DailyMail 287,113、SamSum 14,731、DialogSum 12,460、MS MARCO 504,111。

**Stage 3 的 checkpoint 策略：** 一个共享多任务 checkpoint 直接用于 FactKG、TriviaQA、NarrativeQA、PubMedQA、LaMP-4、LaMP-7；**PersonaMem-v2 与 PersonalizationV4 额外做 benchmark-specific 微调**——原话理由是"它们的 validation loss 需要更多 epoch 才 plateau，而其他 benchmark 更早 plateau 或开始过拟合"。

**统一训练配置（Table 5）：** AdamW（weight decay 0.01）、cosine annealing + warmup（0.03/0.03/0.1）、bf16、grad clip 1.0、random seed 23、4×H100 80GB；Stage 1/2 effective batch 128、Stage 3 为 64；max decoder length 1024/1024/2048。

**训练成本（[代码] `docs/training.md`）：** 4×H100 下 Stage 1 约 6h、Stage 2 约 4h、Stage 3 约 9h、每个 personalisation recipe 约 25min；数据仓库约 320 GiB（几乎全是 embeddings），Stage 1/2/3 分别下载约 27/60/223 GiB；`evaluate.py --benchmark all` 约 11 GiB、单卡约 15 分钟。

> **文档不一致（本文核对发现）：** 仓库 README 的 checkpoint 表写 `pv4/`、`pmv2/` 是"from Stage 1"、recipe 为 `single_task.yaml`；但 `configs/personalization_pv4.yaml` 与 `personalization_pmv2.yaml` 实际写 `init_memory: runs/stage3/epoch-04`，`docs/training.md` 也说"Personalisation continues the last Stage 3 epoch"。论文 Table 5 与 §2.6 均支持"Stage 3 之后再微调"。**README 该表应视为过期**，以 config 为准。详见 [03 §3.4](03-claims-and-evidence.md)。

## 4. 评测设置（§3）

### 4.1 八个 benchmark（Table 7）

| 类别 | benchmark | 任务 | $\bar\mu$ docs/q | $\bar\mu$ tok/q | test |
| --- | --- | --- | --- | --- | --- |
| 个性化 | **PersonalizationV4（PV4，本文提出）** | Personalization SA | 200 | 50,476 | 4,237 |
| 个性化 | **PersonaMem-v2（PMv2）** | Personalization SA | 116 | 31,618 | 5,000 |
| 长文档 | **NarrativeQA（NQA）** | 长文档生成式 QA | 1,420 | 76,225 | 10,557 |
| 知识密集 | **FactKG** | KG fact verification | 129 | 1,665 | 9,041 |
| 长文档 | **TriviaQA** | 开放域事实 QA | 164 | 11,861 | 500（验证子集） |
| 知识密集 | **PubMedQA** | 生物医学 QA | 4 | 324 | 100 |
| 个性化 | **LaMP-4** | 个性化标题生成 | 172 | 7,638 | 1,925（dev） |
| 个性化 | **LaMP-7** | 个性化推文改写 | 18 | 465 | 1,500（dev） |

**评测口径（§3.3）：** 分类用 accuracy；短答用 exact match 与 token-level F1；开放生成用 ROUGE/BLEU/F1/METEOR。**PMv2 与 PV4 是 short-answer accuracy**：模型在**看不到选项**的情况下自由生成，生成结果与所有候选答案用**冻结 encoder 做 embedding 最近邻**判定，最近邻是参考答案才算对。所有监督评测 greedy（T=0）。服务栈强制 32,768-token 上下文，超出则启用 YaRN。

**文档分块（Table 2）：** PMv2 = 一个会话（均值 280 token）、PV4 = 一段对话（252）、PubMedQA = 一个摘要 section（84）、TriviaQA = 证据段落按 128 token 切（70）、NarrativeQA = 故事段落按 ~256 token 切（94）、FactKG = 一条三元组（13）、LaMP-4 = 一条 profile（47）、LaMP-7 = 一条推文（25）。

**训练/评测用户严格不相交**（PV4、PMv2、LaMP-4、LaMP-7）；TriviaQA 用 seed-23 验证子集 n=500；PubMedQA 用 PQA-L 派生的 900/100 划分中的 100。

### 4.2 Baselines（§3.1 + Appendix C）

| 方法 | 形态 | 关键设置 |
| --- | --- | --- |
| Closed book | 无文档 | 看参数知识能答多少 |
| **RAG-$k$** | 文本 | 与 MEMORILLA **共用同一 encoder** 与同一批 chunk，按余弦取 top-$k$ 原文，最多相似在前 |
| **Full Context** | 文本 | 全部 chunk 按原序放入上下文（超 32,768 用 YaRN ×4） |
| **LLMLingua-2** | 文本压缩 | XLM-RoBERTa-large 分类器删 token；**分类器看不到问题**，集合压缩一次复用于所有 query |
| **xRAG** | 隐压缩 | 取 top-1 chunk 的 embedding，经训练 bridge 映射成**1 个 soft token**；bridge 27,276,288 参数 |
| **ComMer** | 隐压缩 | 只对比其**论文报告**的 LaMP-4/LaMP-7 数字 |
| **Mem0** | agent 记忆 | mem0ai 0.1.118 原版 prompt 与 ADD/UPDATE/DELETE/NONE 循环；写入用冻结 Qwen3-4B-Instruct-2507；深度扫 k∈{10,30,50} |
| **MemoRAG** | agent 记忆 | 官方仓库原版 prompt；冻结 Qwen3-4B-Instruct-2507 读集合产生 clue；扫 native/5/50；`use_memory_answer=False` |

**公平性设计（原文明确）：** 所有方法都用**同一个冻结 Qwen3-8B decoder**、**同一个冻结 Qwen3-Embedding-4B encoder**；Mem0/MemoRAG 额外用 Qwen3-4B-Instruct-2507 建记忆，以匹配 MEMORILLA 读同一批集合的 4B 编码器规模——**"每个方法都用 4B 模型处理文档、用同一个冻结 Qwen3-8B 回答"**。

## 5. 主结果（§4，Table 11）

**八 benchmark 主指标（0–100，越高越好）：**

| Benchmark / 指标 | Full Context | 最佳 baseline | MEMORILLA | 压缩倍数 |
| --- | --- | --- | --- | --- |
| PMv2 Acc (SA) | 27.92 | 30.90 xRAG | **44.60** | 1,974× |
| PV4 Acc (SA) | 59.12 | 67.88 MemoRAG | 66.65 | 3,153× |
| PV4 Acc (SA, Hard) | 36.57 | 45.95 MemoRAG | 41.97 | — |
| PubMedQA Acc | 67.00 | 69.00 LLMLingua-2 | 59.00 | 20× |
| NarrativeQA ROUGE-L | 17.99 | 20.51 MemoRAG | 19.31 | 4,212×（BLEU-1 列） |
| TriviaQA EM | 52.60 | 56.60 MemoRAG | **57.00** | 743× |
| FactKG Acc | 80.43 | 80.43 Full context | **84.33** | 108× |
| LaMP-4 ROUGE-L | 14.21 | 16.10 xRAG | **18.15** | 474× |
| LaMP-7 ROUGE-L | 43.71 | 46.84 xRAG | **48.37** | 29× |

**平均口径：** MEMORILLA 平均分 **49.68**，在 8 个 benchmark 中**领跑 5 个**（PMv2、FactKG、TriviaQA、LaMP-4、LaMP-7），在 NarrativeQA 与 PV4 上第二。紧凑 baseline 的平均分：xRAG 41.92、LLMLingua-2 40.75、Mem0 38.02。文档 token 的几何平均上，MEMORILLA 比 full context 少 **394×**、比 RAG-50 少 **113×**、比 MemoRAG 少 **49×**。

> **口径警告：** 49.68 是**把 accuracy、ROUGE-L、EM 直接相加求均值**得到的合成数（主页原文承认 "The reported mean combines different metrics"）。它只能在同一张表内横向比较方法，不能当作"平均准确率"解读。见 [03 §3.2](03-claims-and-evidence.md)。

### 5.1 三条最有分量的证据线

**（1）FactKG：在**全信息**条件下超过全上下文。**
MEMORILLA 84.33% vs 全上下文 80.43%、MemoRAG 80.38%、xRAG 78.98%；token 分别为其 1/108 与 1/36。原文的逻辑很干净：**全上下文看到了全部 1,727 个文档 token**，所以 MEMORILLA 的领先**不可能**来自"丢了证据没读到"。

**（2）错题互补：隐记忆与检索解不同的题（Figure 5）。**
FactKG：15.9% 的题**只有** MEMORILLA 对，10.0% **只有** RAG-50 对；PMv2 short-answer：27.1% vs 9.2%。oracle union（"任一方法答对"）——**下表数字是"答对的题目占比 %"，不是分数**：

| benchmark | RAG-50 | MEMORILLA | oracle union |
| --- | --- | --- | --- |
| FactKG | 78.4 | 84.3 | **94.3** |
| PV4 | 65.8 | 66.6 | **80.4** |
| PubMedQA | 67.0 | 59.0 | **80.0** |
| TriviaQA | 55.6 | 57.0 | **74.2** |
| LaMP-7 | 37.2 | 50.1 | **56.1** |
| NarrativeQA | 32.1 | 37.9 | **54.3** |
| PMv2 | 26.7 | 44.6 | **53.8** |
| LaMP-4 | 26.6 | 37.2 | **46.6** |

原文明确 union 是 **oracle 上界、不是实测混合系统**，但它把 union 与两者差距（FactKG 差 10 个点、PMv2 差 9 个点）当作"混合架构值得做"的直接动机。

**（3）什么时候隐记忆赢、什么时候检索赢（Figure 4）。**

- **NarrativeQA 按首词分题型：** "why" 上 MEMORILLA **+4.91** ROUGE-L、"how" 上 **+7.02**；反之 "who" 上 RAG 领先 **3.45**、"which" 上领先 **2.93**。原文解释：压缩保留**全局结构与因果**，但会丢**逐字表面 token**；检索擅长精确命中实体名。原文同时诚实提示：题型也与答案长度、实体频率相关。
- **FactKG 按实体数：** MEMORILLA 相对 RAG-50 的领先**随实体数单调增长**，从 1 个实体 **+4.23pp** 到 4+ 个实体 **+7.59pp**。
- **FactKG 按组合事实数：** RAG-50 从 78.7 掉到 **51.8**，MEMORILLA 稳定在 80–89 区间。
- 原文还给出一个诚实的限定：**73.5% 的 FactKG claim 超过 50 个 chunk**，所以 RAG-50 的差距**部分**来自"50 个 chunk 根本覆盖不到证据"；但**全上下文读了每一条，仍然落后 MEMORILLA**（80.43 vs 84.33），所以覆盖不足不是全部解释。

### 5.2 记忆不奏效的地方（原文专列一节）

- **PubMedQA**（4 个摘要共 324 token）：LLMLingua-2 69.00%、另有四个 baseline 67.00%、**MEMORILLA 59.00%**。原文结论：**源本身很短、放进上下文根本不贵时，压缩没有收益**。
- **NarrativeQA ROUGE：** MemoRAG 21.80/20.51 vs MEMORILLA 19.68/19.31，**但用了 50× 的 token**；原文归因于它能读到逐字段落。
- **PV4：** MemoRAG 67.88 vs 66.65，**用了 690× 的 token**。

### 5.3 "全上下文不是上界"（原文小节）

- 全上下文除 PubMedQA 外**在每一个 benchmark 上落后** MEMORILLA；在 Table 11 的 **21 个指标里有 20 个**落后。
- RAG-50 又在 **15 个**指标上超过全上下文。
- 结论原话："supplying the entire collection hurts more often than it helps."

### 5.4 两个方法都做不对的题（§5）

- **PV4：** 多数失败题需要**把用户历史中各处都出现过的事实链接起来**——错误来自**组合**而非**找不到**。
- **FactKG：** 两个方法都偏向判"假"。**两个都答错的题里 89.5% 是真 claim**，而两个都答对的题里真 claim 只占 **28.7%**——指向**决策阈值失准**，不是证据缺失。

## 6. Agent 持续学习：TextWorld 上的 RL 记忆（§6 + Appendix G）

**设置：** 冻结 **Qwen3-4B-Instruct-2507** decoder + 冻结 Qwen3-Embedding-4B encoder，**只训练记忆模块**（随机初始化、不加载监督 checkpoint），用 **GRPO**（无 critic；group size $G=16$；PPO clip 0.2；无 KL/entropy；AdamW lr 5e-4 无 warmup）在**环境奖励**上训练。

- **环境：** TextWorld，最多 **65 个房间**、**50 回合**内完成多步目标；800 条训练 prompt，验证/测试各 40 局（其中 30 局不同，5 个 medium + 5 个 hard 出现两次）。
- **记忆：** 从第 2 回合起，每完成一回合就作为**一篇文档**存入（observation 截 200 字符 + action，平均 74 token）；用当前 observation 作 query，产出 **K=8** 个记忆向量放在 prompt **之前**。
- **关键对照设计：** 所有条件**保留完整历史文本**、**同一输入预算**（训练 16,000 / 评测 4,096 token）。因此任何提升**只能**来自"记忆学到了抽取什么"，而不是"多给了信息"。原文特别说明：这里记忆**补充**文本，而非**替代**文本，以区别于 §4 的压缩结果。

**结果（Figure 8）：**

| 指标 | Full-history ICL | 未训练记忆 | 训练后 MEMORILLA |
| --- | --- | --- | --- |
| avg@3 | 0.186 | 0.153 | **0.242** |
| pass@3 | 0.250 | 0.225 | **0.375** |
| 未到回合上限就结束的 episode | 29% | — | **42%** |
| 4,096-token 预算被耗尽的比例 | **71%** | — | **58%** |

**行为变化：** 最大的变化是**终止（termination）而非解题率**——训练后的记忆帮 agent **逃离导航循环**、执行带钥匙的动作序列（先解锁再开容器）。剩下失败集中在最长的游戏（quest 逼近或超过 50 回合限制、需要跨多房间回溯）。

## 7. 消融与容量（Appendix E）

### 7.1 记忆架构（Table 13，PMv2 SA）

所有方法共享 encoder/decoder/训练 recipe/prompt/decoder，**从零训练**（因此绝对值**不能**与 Table 11 对比）：

| 方法 | Query aware | 参数量 | PMv2 SA |
| --- | --- | --- | --- |
| Global mean-pool | no | 6,566,400 | 28.94 |
| Segmented mean-pool | no | 6,566,400 | 29.68 |
| Segmented, parameter-matched | no | 190,149,120 | 31.10 |
| Cosine top-16, parameter-matched | yes（硬） | 190,149,120 | 33.86 |
| Documents only（Q-Former 变体，无 query） | no | 268,856,320 | 34.72 |
| Q-Former（先 self-attn 再 cross-attn） | yes（软） | 268,856,320 | 43.34 |
| **MEMORILLA** | yes（软） | 190,190,080 | **44.04** |

**三条结论：**
1. **query-independent pooling 最弱，加参数也救不回来**（segmented 参数匹配后仅 31.10 vs MEMORILLA 44.04）。
2. **Q-Former 很接近**（43.34 vs 44.04）；在 FactKG 上 MEMORILLA 82.56 仍胜 Q-Former 80.48（后者参数更多：268,856,320）。
3. **噪声测试（关键因果证据）：** 把每个文档 embedding 换成高斯噪声后，**documents-only 只变 +0.04**，而 MEMORILLA **掉 5.93**、Q-Former 掉 5.11。原文结论：增益来自**"先条件化槽、再让它去读"**这个顺序，而不是任一交互单独作用。

### 7.2 容量与预算（E.2 / E.3）

- **训练时容量：** K=16 与 K=128 从头训练对比，8 个 benchmark 中**4 个移动不到 1 个点**，而 PMv2 与 PV4 **下降**——所以全程用 K=16。原文提示这只关"容量"，不是部署 checkpoint 的结论。
- **推理时预算（Figure 10）：** 不重训练、只用前 K 个槽。PMv2 在 K=4 前贴近 closed-book（26.58 vs 25.64），到 K=16 升到 44.60；PV4 从 closed-book 附近（57.66 vs 58.30）在 K=2、4 下探后升到 66.65。**两者收益都集中在最后几个槽**；FactKG/TriviaQA/NarrativeQA 每次减半都掉；PubMedQA 与 LaMP-4 只在 K≥8 后改善，LaMP-7 仅从 K=16 起改善。原文结论：**所需记忆容量正比于任务要求的跨文档整合程度**。

### 7.3 冻结 vs LoRA、encoder 规模（E.4 / E.5）

- **LoRA 对照：** rank-130 LoRA、268.4M 参数、**无文档**、在 4B decoder 上训练。MEMORILLA **在每个主指标上都领先**（PubMedQA 与 LaMP-7 差距在噪声内）。配合噪声测试，说明增益依赖**存储的证据**而非单纯适配。
- **encoder 规模：** Qwen3-Embedding-4B → 8B，**每项分数变动 ≤1.3**，只有 PubMedQA +3.00（对应 100 题中的 3 题）。同族内更大 encoder 影响很小。

### 7.4 与 ComMer 的对比（Table 12）

| 方法 | token 数 | LaMP-4 ROUGE-L | LaMP-7 ROUGE-L |
| --- | --- | --- | --- |
| ComMer | 128 | 17.50 | 45.00 |
| MEMORILLA(4B) | **16** | 17.72 | 47.04 |
| MEMORILLA(8B) | **16** | 18.15 | 48.37 |

（ComMer 用 Gemma-2b，MEMORILLA 用 Qwen3；差异不完全是模型等价对比。）

## 8. 服务成本（Appendix F，Table 14）

单卡 H100-80GB、batch 1、bf16、greedy、max_new_tokens=32、250-token 文档、5 次计时取中位数、2 次 warmup：

| 路径 | 量 | N=1 | N=512 | 增长 |
| --- | --- | --- | --- | --- |
| 写 | 文档编码 | 22.92 ms | 2,588.84 ms | 线性于 N |
| 写 | 每文档存储 | 5 KB | 5 KB | 平坦 |
| 读 | 记忆模块 forward | 2.01 ms | 1.96 ms | −0.06 ms |
| 读 | CPU→GPU 传输 | 0.014 ms | 0.060 ms | +0.046 ms |
| 读 | decoder 上下文 token | 16 | 16 | 平坦 |
| — | **MEMORILLA 端到端** | **740 ms** | **739 ms** | −1.9 ms |
| — | **Full Context 端到端** | 749 ms | **19,932 ms** | +19,184 ms |

**两个原文结论：**
1. **写路径成本与稠密检索共享**（同一套 embedding / 同一索引），不是额外开销。
2. **本方法的收益不是"单次 query 更快"，而是 read 成本随集合增长保持平坦、并摊薄到 Q 个 query 上**；绝对延迟仍由 decoding 主导。

**存储对比：** PV4 上 store 比对应 KV cache **小 7,266×**（50,455 文档 token × 144 KiB/token ≈ 6.9 GiB，对比 200 个 2,560 维 bf16 embedding）。N=512 时 full context 是 128,064 token，超过强制的 32,768，需 YaRN（factor 4）。原文注明计时用 HF transformers `generate`、**无 paged KV cache**，所以 full context 延迟依赖服务栈。

## 9. 主页的其余内容

- **交互式 walkthrough（10 步）：** 用"缺铁性贫血 → 半程马拉松"三段会话演示"记住 / 召回"循环：Session 1 说诊断 → 编码存入 store → Session 2 问饮食（旧会话已不在上下文）→ query 编码、槽 attend 全部会话 → 变成 16 个 memory token → Session 2 也存入 → Session 3 同时依赖前两段 → LLM 组合跨会话信息。**主页明确标注注意力权重是示意、非实测**（[代码] 站点 JS 中 16 个槽的权重是硬编码数组）。
- **RAG vs MEMORILLA 并排演示（6 步）：** 同一问题下，RAG 取 top-3 命中"办公室零食 / 半程马拉松 / 下午犯困"（相关但低于 cutoff），MEMORILLA 用 attention 覆盖全部会话并给出"结合缺铁性贫血与半马训练"的回答。
- **FactKG 两跳示例：** claim "AGM-88 HARM is produced by a company that manufactures the ALV X-1"，集合 **27 条三元组**，claim 本身**从不点名**连接导弹与火箭的公司。RAG-50 读全部 27 条仍判 **False（错）**、全量 78.4%；MEMORILLA 把这 27 条读进 **16 个 memory token** 判 **True（对）**、全量 84.3%。主页自己注明**单个 claim 不代表整体表现**。
- **PersonalizationV4 示例：** 同一问题下 No memory / Retrieval / MEMORILLA 三种回答，MEMORILLA 用"缺铁性贫血"历史给出个性化建议。
- **"Memory and retrieval"小节：** 明确 MEMORILLA **互补而非替代**检索：答案取决于"集合如何组织在一起"时隐记忆占优；答案是"能逐字找到的名字"时检索占优；**短源（如 PubMedQA）直接读原文更好**。
- **Future directions（主页）：** ① 有连续性的助手（每个用户独立 store、可留在设备上、可按要求删除）；② 让经验改进行动（跨任务吸取教训、避免重犯）；③ **超越单一模型**（store 只存 embedding，可扩展到图像/音频/视频，可让一个 store 服务多个模型）；④ 累积式科学推理（配对"隐记忆做综合 + 检索做精确验证"）。**最近步骤：** 隐记忆与检索配对、为压缩训练 encoder、测试跨模型族迁移。
- **Current limits（主页 + 论文 §7）：**
  - 会丢细粒度细节（如精确名字），可能因为文档 encoder **从未为记忆压缩训练过**；
  - 因为把记忆**直接写进 LLM 的输入 embedding**，所以**需要开放权重、且每个 LLM 都要训一个记忆模块**；
  - 所有实验都是 Qwen encoder + Qwen decoder、纯文本，跨模型族与多模态**未测**；code/science 等领域（生物医学之外）未测；
  - TextWorld agent 只在**单一游戏套件**、≤50 回合上训练与评测，跨环境与长期部署未证。

## 10. 论文的自陈局限、伦理与可复现性

- **Limitations：** 同上一节；补充"因为 LLM decoding 主导延迟，效率收益主要体现在大集合上"，以及"记忆模块可共享一个持久 store、向不同规模的 LLM 注入记忆"是未来方向。
- **伦理：** 存储与召回用户对话引发隐私问题；store 在 LLM 外部，**用户 embedding 可不重训直接删除**，但**存储的 embedding 仍可能编码敏感信息**，部署应取得用户同意并保护；PersonalizationV4 全部为合成用户、无真实数据，且所有 persona 遵循**同一机器模板**。
- **可复现性：** 方法（§2）、课程与目标（§2.4/2.6）、训练数据（B.1）、超参与分块（B.2）、每个 baseline 实现（C）、benchmark 与 PV4 流程及预算（D）、TextWorld RL（G）全部给出；所有监督评测 greedy + 固定 seed；代码、带预计算 embedding 的训练/评测数据、PersonalizationV4 数据均在项目网站发布。
- **AI 使用声明（原文）：** 用 coding agent 实现并跑实验，用生成式 AI 仅"最少地润色写作"；PersonalizationV4 的 persona 由 GPT-5 生成、问题类别/话题/问题由 GPT-5.1 生成、对话由 GPT-5-mini 生成；作者审阅了全部 AI 辅助工作并核验了代码与实验结果。
- **算力：** Stanford 的 Marlowe（GPU 计算仪器）；致谢列出 NSF/NIH/Gates/Stanford HAI/CZI/Amazon/Genentech/SAP/SCBX 等资助。
