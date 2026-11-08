# references · 引用与核验记录

> 本文全部引用分三类：**§1 源材料**（主页、论文、代码仓库、HF 资源）、**§2 论文参考文献的核验**、**§3 抓取与核验方法**。
> 核验时间：**2026-11-08（UTC+8）**。凡未通过核验的链接一律不写入正文，或在表中显式标注失败原因。

## 1. 源材料核验

下表全部由本次直连（部分经 HTTP 代理，见 §3）请求核验。

| 类别 | 标签 | URL | 状态 |
| --- | --- | --- | --- |
| 项目主页 | MEMORILLA（`memory.stanford.edu`） | <https://memory.stanford.edu/> | 200 |
| 论文（摘要页） | arXiv:2610.21375 | <https://arxiv.org/abs/2610.21375> | 200 |
| 论文（HTML 全文） | v1 | <https://arxiv.org/html/2610.21375v1> | 200（482,129 bytes） |
| 论文（HTML 全文） | v3 | <https://arxiv.org/html/2610.21375v3> | 200（481,608 bytes） |
| 会议投稿页 | COLM Workshop 页面（BibTeX 所引） | <https://openreview.net/forum?id=VV0vvzL783> | 200（OpenReview 有浏览器校验，本文未依赖其正文） |
| 代码仓库 | snap-stanford/memorilla（Apache-2.0） | <https://github.com/snap-stanford/memorilla> | 200 |
| 代码仓库（文件树 API） | `git/trees/main?recursive=1` | <https://api.github.com/repos/snap-stanford/memorilla/git/trees/main> | 200（76 个条目） |
| 模型 | HF `memorilla/Memorilla-Qwen3-8B` | <https://huggingface.co/memorilla/Memorilla-Qwen3-8B> | 200 |
| 数据集 | HF `memorilla/Memorilla-Data` | <https://huggingface.co/datasets/memorilla/Memorilla-Data> | 200 |
| 数据集 | HF `memorilla/PersonalizationV4`（CC BY 4.0） | <https://huggingface.co/datasets/memorilla/PersonalizationV4> | 200 |
| HF 组织 | `memorilla` | <https://huggingface.co/memorilla> | 200 |

**主页关键资源：**

| 资源 | URL | 状态 |
| --- | --- | --- |
| Pareto frontier 图（SVG） | <https://memory.stanford.edu/figures/frontier.svg> | 200（image/svg+xml，188,912 bytes） |
| 项目图（gorilla） | <https://memory.stanford.edu/gorilla.png> | 200（image/png，121,835 bytes） |
| 交互 walkthrough 的 16 槽权重 | 站点 JS chunk `3iauhmowglj5r.js`（内联硬编码数组，主页标注为示意非实测） | 200 |

**论文配图（arXiv HTML 内嵌，可直连核验）：**

| 图 | URL | 状态 |
| --- | --- | --- |
| Figure 1 frontier | `https://arxiv.org/html/2610.21375v1/figures/results/fig1_frontier.png` | 200（164,123 bytes） |
| Figure 5 complementarity | `https://arxiv.org/html/2610.21375v1/figures/results/complementarity.png` | 200（152,075 bytes） |

（其余 per-benchmark、breakdown、budget、ablation 图在 HTML 中同名同目录，见 [data/figures.md](data/figures.md)。）

## 2. 论文自身参考文献的核验

论文参考文献数量很大（正文 + Appendix 引用约百条）。本文只对**正文数字化论断实际引用的来源**做核验；下表用 arXiv API 或直达 URL 逐条确认标题与可达性。

| 标签（论文引用） | 出处 | 验证标题 | 状态 |
| --- | --- | --- | --- |
| TextWorld | arXiv:1806.11532 / Springer CGW 2018 | TextWorld: A Learning Environment for Text-based Games | 200 |
| MemoRAG | arXiv:2409.05591 / ACM Web 2025 | MemoRAG: Boosting Long Context Processing with Global Memory-Enhanced Retrieval Augmentation | 200 |
| Mem0 | arXiv:2504.19413 | Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory | 200 |
| PersonaMem-v2 | arXiv:2512.06688 | PersonaMem-v2: Towards Personalized Intelligence via Learning Implicit User Personas and Agentic Memory | 200 |
| YaRN | arXiv:2309.00071 / ICLR | YaRN: Efficient Context Window Extension of Large Language Models | 200 |
| Qwen3 | arXiv:2505.09388 | Qwen3 Technical Report | 200 |
| DeepSeekMath（引入 GRPO） | arXiv:2402.03300 | DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models | 200 |
| BLIP-2（Q-Former 来源） | arXiv:2301.12597 | BLIP-2: Bootstrapping Language-Image Pre-training with Frozen Image Encoders and Large Language Models | 200 |
| MemGPT | arXiv:2310.08560 | MemGPT: Towards LLMs as Operating Systems | 200 |
| LaMP | <https://aclanthology.org/2024.acl-long.399/> | LaMP: When Large Language Models Meet Personalization | 200 |
| FactKG | <https://aclanthology.org/2023.acl-long.895/> | FactKG: Fact Verification via Reasoning on Knowledge Graphs | 200 |
| NarrativeQA | <https://aclanthology.org/Q18-1023/> | The NarrativeQA Reading Comprehension Challenge | 200 |
| TriviaQA | <https://aclanthology.org/P17-1147/> | TriviaQA: A Large Scale Distantly Supervised Challenge Dataset for Reading Comprehension | 200 |
| PubMedQA | <https://aclanthology.org/D19-1259/> | PubMedQA: A Dataset for Biomedical Research Question Answering | 200 |
| LLMLingua-2 | <https://aclanthology.org/2024.findings-acl.57/> | LLMLingua-2: Data Distillation for Efficient and Faithful Task-Agnostic Prompt Compression | 200 |
| xRAG | <https://proceedings.neurips.cc/paper_files/paper/2024/hash/c5cf13bfd3762821ef7607e63ee90075-Abstract.html> | xRAG: Extreme Context Compression for Retrieval-Augmented Generation with One Token | 200 |
| Faithful Persona-based Conversational Dataset（PV4 的 persona 种子） | arXiv:2312.10007 | Faithful Persona-based Conversational Dataset Generation with Large Language Models | 200 |
| MemoRAG 会议版 | <https://doi.org/10.1145/3696410.3714805> | （ACM DOI） | **403**（DOI 解析对自动抓取返回 403；论文引用的已发表版本本身有效，本文未据此页核对内容，改用 arXiv:2409.05591 核验） |
| Perceiver | OpenReview `wHBfxhZu1u` | Perceiver: General Perception with Iterative Attention | 200 |

**主页出链核验（`memory.stanford.edu` 页面内的全部外链，共 23 条唯一 URL）：** GitHub / HF / arXiv / Springer（TextWorld）/ ACL Anthology（LaMP、FactKG、NarrativeQA、TriviaQA、PubMedQA、LLMLingua-2）/ NeurIPS（xRAG）/ Mem0 / MemoRAG（ACM DOI）/ arXiv（PersonaMem-v2、YaRN、Qwen3、DeepSeekMath）等，状态见 §1 与上表，全部可达（ACM DOI 403 属站点反爬）。

## 3. 抓取与核验方法

| 项 | 做法 |
| --- | --- |
| 主页正文 | `curl` 直连（HTTP 200，压缩传输后 300,028 bytes，`--compressed` 得到完整页）；去 script/style 后转文本，共 322 行、约 20.7k 字符 |
| 主页交互数据 | 提取 Next.js chunk（10 个 JS 文件），在 `3iauhmowglj5r.js` 中找到 walkthrough 的 10 步帧定义、3 段示例对话与 16 个硬编码注意力权重（主页已声明为示意） |
| 主页图表数值 | 从内联 SVG 提取全部 `<text>` 数值（FactKG 实体数 / 组合事实数、oracle union 各值），与论文 Table 11/Figure 5 逐项对照 |
| 论文正文 | v1 HTML 直连（482,129 bytes）→ 文本 109,057 字符 / 2,748 行；另抓 v3（481,608 bytes）复核关键数字一致 |
| 论文表格 | 正则提取 HTML `<table>` 共 26 个，转文本用于逐格核对（Table 1–15 全部覆盖） |
| 论文图注 | 提取全部 `<figure>`（44 个，含子图与表格），得到 Figure 1–13 与 Table 1–15 的图注与图片路径 |
| 代码仓库 | GitHub API 取文件树（76 条目）；`raw.githubusercontent.com` 取 README、`docs/data.md`、`docs/training.md`、`docs/evaluation.md`、`memorilla/memory.py`、`configs/*.yaml` 全文阅读 |
| HF 资源 | 经 HTTP 代理取模型卡、Memorilla-Data 卡、PersonalizationV4 卡原文 |
| 数字复核 | 逐项回算压缩倍数（Full Context token ÷ 16）、几何平均、21 个指标计数、错题互补自洽性，见 [03 §2](03-claims-and-evidence.md) |
| 网络说明 | `huggingface.co` 直连超时，改用 HTTP 代理 `http://127.0.0.1:1234`；`aclanthology.org`、`arxiv.org`、`github.com` 可直连。代理仅用于读取公开页面，未使用任何账号凭据 |
| 核验原则 | 未成功抓取的内容不写入正文；仅在明确标注来源时引用第三方材料；对原文自身的口径不一致在 [03 §3.2](03-claims-and-evidence.md) 单列 |

**未取得的内容（诚实记录）：**
- **OpenReview 论坛页**（`VV0vvzL783`）有 Cloudflare Turnstile 浏览器校验，**未取得其评审正文**；论文 BibTeX 中的会议名取自 HF 模型卡与论文自身 BibTeX，未从 OpenReview 复核。
- **ACM DOI**（MemoRAG 会议版）对自动抓取返回 403；改以 arXiv:2409.05591 核验内容。
- **论文 PDF 全文**（3,988,803 bytes）在 600 秒内只取到 430,722 bytes，**未完成下载**；因此本文全部论文内容以 **arXiv HTML 全文**为准（HTML 与 PDF 的版本同为 v1/v3，正文数字已跨版本抽查一致）。
- **Figures 2–13 的绘图数据**：论文仅提供 PNG/SVG，无 CSV，故本文不重算这些曲线，只引用其标注数值。

## 4. 本仓库交付物索引

| 文件 | 内容 |
| --- | --- |
| [README.md](README.md) | 一页结论与文档索引 |
| [01-article-analysis.md](01-article-analysis.md) | 主页与论文逐节详细解析（含全部数字与图表编号） |
| [02-design-recommendations.md](02-design-recommendations.md) | 对后续 memory 系统设计的建议 |
| [03-claims-and-evidence.md](03-claims-and-evidence.md) | 论断—证据对照、缺口、口径陷阱与可复现性 |
| [references.md](references.md) | 本页 |
| [data/figures.md](data/figures.md) | 主页交互图形与论文 Figure/Table 索引 |
