# 引用与核验记录

> 核验日期：2026-11-12（Asia/Shanghai）。核验方式：直连 HTTP 抓取 + GitHub API（`gh`）只读核查。
> 说明：本仓库 CI 未配置检查；本页记录的是本文撰写时的实际核验状态。

## 一、首要来源

| # | 来源 | 链接 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| R1 | LMSYS Org blog, *Unified Memory in SGLang: One Arena for Every Token Lifetime*（2026-11-11） | <https://www.lmsys.org/blog/2026-11-11-unified-memory> | HTTP 200，86,763 字节 | 正文与 6 张图（SVG）均抓取核验；正文由 HTML 去标签提取，图注由 `aria-label` 全文核验 |
| R2 | SGLang docs — *Unified Memory for Hybrid Models* | <https://docs.sglang.io/docs/advanced_features/unified_memory> | HTTP 200，15,228 字节（`.md`） | `lastModified: 2026-11-12T05:54:50.942Z`；`originalFileLocation: docs/advanced_features/unified_memory.mdx` |
| R3 | SGLang docs — *Unified Memory Design* | <https://docs.sglang.io/docs/advanced_features/unified_memory_design> | HTTP 200，40,705 字节（`.md`） | 贡献者向设计文档；含 module map、不变量、stress harness 与 trace 工具 |
| R4 | 原文内嵌图 Figure 1–6 | `https://www.lmsys.org/images/blog/unified-memory/fig{1..6}-*.svg` | 6/6 HTTP 200 | 图注与 CDN 地址见 [data/figures.md](data/figures.md) |

## 二、上游代码事实（GitHub API 核验）

| # | 事实 | 核验命令（只读） | 结果 |
| --- | --- | --- | --- |
| G1 | 博客所述 SGLang revision `daa171846f` 存在 | `gh api repos/sgl-project/sglang/commits/daa171846f` | 存在；`[Fix] hicache: settle storage backups at the rank-agreed written prefix (#47626)`，提交于 2026-11-10T18:12:22Z |
| G2 | `python/sglang/srt/mem_cache/kv/` 目录存在（设计文档所述模块路径） | `gh api repos/sgl-project/sglang/contents/python/sglang/srt/mem_cache/kv` | 存在；含 `advance.py`、`alloc/`、`build.py`、`decl.py`、`layout/`、`memory/`、`plan.py`、`requests.py`、`routed_cache.py`、`sizing.py`、`state_policy.py`、`state_storage.py`、`storage.py` |
| G3 | `--enable-unified-memory` 已合入主干 | `gh api repos/sgl-project/sglang/contents/python/sglang/srt/arg_groups/kv_cache_hook.py` | `cfg.enable_unified_memory` 分支存在（含 FP4 KV、LMCache、PD、decode KVO 等拒绝逻辑） |
| G4 | 统一内存相关 PR 已合并 | `gh pr view #49300/#49301/#49310/#49312` | 均为 `state=MERGED`；#49300 `mergedAt=2026-11-10T17:18:15Z`，#49312 `mergedAt=2026-11-10T17:24:26Z`（作者 `ch-wan`，Cheng Wan） |
| G5 | 主干最新提交（核验时快照） | `gh api repos/sgl-project/sglang/commits/main` | `bad3dd51002438423c16915e61c652ef3fbf18ec`，2026-11-12T07:36:43Z |
| G6 | SGLang 仓库为公开仓库 | `gh api repos/sgl-project/sglang --jq .visibility` | `public` |

## 三、我们工作侧的来源

| # | 来源 | 链接 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| O1 | DwarfStar `ds4` 上游仓库 | <https://github.com/antirez/ds4> | 公开 | 本地工作副本快照 `b3f50180ec2c`（2026-11-03T15:55:02Z，`Read half-aligned Qwen Q2 weight rows correctly on Metal`） |
| O2 | 我们的 Strix Halo TP 公开 fork | <https://github.com/wkljohn/ds4-strix-halo-tp-odinlink> | `public`；`pushed_at 2026-09-20T15:38:22Z` | 用于核验 KDA 状态量、OdinLink/ROCm 约束等事实 |
| O3 | fork `docs/GLM5-KDA.md` | 同上 | 已核验 | GLM-5.3 的 34 个 KDA 层每 TP rank 常驻每序列状态 **152,633,344 B（145.56 MiB）**；含三个因果卷积历史 + 每层 recurrent 矩阵 |
| O4 | 本地 `ds4-new` 工作副本文档 | `docs/SSD_STREAMING.md`、`docs/SERVER.md`、`docs/STRIX_HALO.md`、`docs/MODELS.md`、`docs/QWEN38_FLASH_NEXT.md` | 只读走查 | 专家缓存预算、disk KV cache、多 session 上下文、统一内存/SSD 分层约束 |
| O5 | 本仓库在评审中的分析：DS4 SSD 专家 decode 链路 | [PR #8](https://github.com/ai-storage-agent/c2k-pilot/pull/8) | OPEN（未合入） | 单专家 9,953,280 B、全部路由专家 142.38 GiB、decode 不排序等事实引自该归档 |
| O6 | 本仓库在评审中的分析：AFD 与 SGLang 合入状态 | [PR #6](https://github.com/ai-storage-agent/c2k-pilot/pull/6) | OPEN（未合入） | 2026-11-04 快照；其"AFD 未合入主干"的结论早于统一内存合入，两者不冲突 |
| O7 | 本仓库调研：RSI agent harness | [../../research/rsi-agent-harness/README.md](../../research/rsi-agent-harness/README.md) | 已存在 | 其"证据分级、明确边界"的写法是本组文档的口径来源 |

## 四、补充来源（用于交叉核对）

| # | 来源 | 链接 | 状态 |
| --- | --- | --- | --- |
| S1 | SGLang 文档索引（发现可用页面） | <https://docs.sglang.io/llms.txt> | 文档自述可用 |
| S2 | SGLang 仓库公开 PR 检索（统一内存相关） | `https://api.github.com/search/issues?q=repo:sgl-project/sglang+unified+memory+in:title+type:pr` | 返回 #49913（open）、#49719（open）、#49300/#49301/#49310/#49312（closed，均 2026-11-10 合并）、#49178（closed）、#48600（open） |

## 五、未能核验 / 诚实声明

1. **作者自报的性能数字未复现。** 我们没有 H200、也没有 SGLang 部署，所有 P1–P6 数字均为原文陈述，按"作者自报"处理（见 [03](03-claims-and-evidence.md)）。
2. **Figure 内的数量未独立核对。** Figure 1/2 的"6 个 bounded unit 中 4 个空闲"、"24 个 full-attention unit 中 17 个空闲"等是示意图数据，我们只核验了图注（`aria-label`）文字，未重建图形语义。
3. **`daa171846f` 之后主干已前进。** 博客数字绑定该 revision；主干后续提交（含 #49300 等）可能已改变行为，本文的机制描述以官方 `[文档]` 的**当前**页面为准并已注明。
4. **原文链接的 usage guide / design guide 指向 `docs.sglang.io`。** 直接抓取 `.md` 版本成功；页面的交互式组件（如命令构建器）内容未纳入本文。
5. **只使用公开来源。** 本文只引用公开网页、公开代码与本地/公开仓库的只读走查；未引用任何非公开讨论材料，也未将其复制到本仓库或 GitHub。
