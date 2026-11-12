# 03 论断与证据

> 证据等级沿用本仓库既有口径：
> **E1** 单案例 / 单次运行；**E2** 同 benchmark 内对照（未给方差）；**E3** 规模曲线或多点趋势；**E4** 产品/代码事实（可直接核验）；**E5** 外部实践或官方文档陈述；**C** 本文推断（明确标注）。
> 原文数字一律按"作者自报、未由我们复现"处理。

## 1. 机制类论断

| # | 论断 | 出处 | 等级 | 说明 |
| --- | --- | --- | --- | --- |
| M1 | 三种状态（full KV / SWA KV / recurrent state）的需求由不同变量驱动，并不同步 | 原文 §Hybrid models | E5 | 概念陈述，无实验 |
| M2 | 启动比例选错会造成明显吞吐/并发损失 | 原文 §Results | E2 | 有对照数字，未给方差 |
| M3 | 一个 arena + 惰性压实消除"免费字节搁浅" | 原文 §Hybrid models + Fig 1/2 | E5 | 机制论证；Figure 用示意数据 |
| M4 | 每 token 一个 entry 使不同 shape/dtype 的行共享分配与生命周期 | 原文 §A new KV layout + Fig 3 | E4 | 可由官方设计文档与主干代码核验 |
| M5 | arena 是字节区域而非同构页数组，各 sub-pool 保留自己的分配单位 | 原文 §One arena… | E4 | `[文档]` 明确列出各 sub-pool 的 unit |
| M6 | 联合需求模型服务 admission / clip / HiCache / PD / 淘汰五处 | 原文 §Admission + Three interfaces；`[文档]` design | E4 | 主干代码路径可核验（`ChainAllocator`、`DEMAND_RULES`） |
| M7 | 三级重排阶梯（no move / compact ends / relayout）按需最小搬移 | 原文 §Admission + Fig 4 | E4 | Figure 4 为构造示例 |
| M8 | 可行性 ≠ 实现：可行性认为所有页可动，实现尽量不动固定页与在途传输 | 原文 §Admission | E5 | 设计立场 |
| M9 | PP 下各 stage 交换几何后从共享逻辑计数独立模拟，无需每次决策交换容量 | 原文 §Admission；`[文档]` design | E4 | `install_stage_capacity` / `simulated_snapshot` |
| M10 | 逻辑释放立即、物理复用等待；四状态 + 两源保护 | 原文 §Keeping pages safe + Fig 5 | E4 | 设计文档给出完整规则表 |
| M11 | 所有 allocator 决策只读逻辑状态，不读本 rank 的 event 是否触发，因此 TP rank 决策一致 | `[文档]` design §Decisions follow logical progress | E4 | 可核验的设计约束 |
| M12 | 新 feature 通过"声明碰哪些页、何时完成"加入，而不是自带同步 | 原文 §Three interfaces | E5 | 设计立场 |
| M13 | 新状态组合 = 新声明，不是新 allocator | 原文 §Composing all three + Three interfaces | E5 | 设计立场 |

## 2. 性能类论断（作者自报）

| # | 论断 | 数字 | 等级 | 口径与缺口 |
| --- | --- | --- | --- | --- |
| P1 | 默认配置下无回退 | Qwen3.5-4B：5,830 vs 5,880 tok/s；GSM8K 均 0.875（200 题） | E2 | 两次运行平均；无方差；单机 H200 |
| P2 | 错误 SWA 比例损失 12% 吞吐 | 7,910 vs 9,030 tok/s（GPT-OSS-20B） | E2 | 两次运行平均 |
| P3 | 错误 Mamba 比例把并发压到 24（默认 51）并损失 14% | Qwen3.5-4B | E2 | 同上 |
| P4 | 无比例时能装更多请求 | 约 1,000 vs 618 并发；+14% 吞吐；TTFT 6 s vs 43 s | E2 | "约 1,000"为约数 |
| P5 | 长上下文更多请求 | 32 vs 22 请求，快 26%（Qwen3.5-4B，16K/4,096，并发 64） | E2 | 两次运行平均 |
| P6 | 更少 retraction | 233 vs 294 per 1,000 completed；`ratio 0.3` 为 0 但并发 24 且慢 20% | E2 | 原文主动指出 0 retraction 是限流假象 |

**数字口径注意：** 原文所有对比都是"统一内存 vs **SGLang 分离池的默认比例**"，不是"vs 最优比例"。因此 P2–P6 证明的是"猜比例的代价"，不能读作"统一内存优于调优后的分离池"。

## 3. 边界与拒绝清单（可直接核验）

| # | 事实 | 等级 | 核验方式 |
| --- | --- | --- | --- |
| B1 | `--enable-unified-memory` 已合入 SGLang 主干 | E4 | 主干 `arg_groups/kv_cache_hook.py` 含 `cfg.enable_unified_memory` 分支（2026-11-12 快照） |
| B2 | 统一内存相关 PR #49300 / #49301 / #49310 / #49312 均已合并（2026-11-10） | E4 | `gh pr view` 返回 `state=MERGED` |
| B3 | 隐含 `--enable-page-major-kv-layout`；`SGLANG_DISABLE_LAZY_COMPACTION` 必须未设置 | E4 | `[文档]` usage guide |
| B4 | 只支持混合模型；纯 full-attention 与 DeepSeek-V4 启动即拒 | E4 | `[文档]` supported models 表 |
| B5 | MPS / MLX 被拒（scheduler 无 device stream） | E4 | `[文档]` known limitations |
| B6 | 仍为 experimental，目标是将来成为默认内存系统 | E5 | 原文 §Limitations |
| B7 | Priority preemption 在统一内存下禁用 | E4 | 原文与 `[文档]` 一致 |
| B8 | PD 失败/超时传输的页在没有远端引擎停止证据的情况下被释放 | E4 | `[文档]` known limitations（两个文档均标注 TODO） |
| B9 | checkpoint 停滞时"通过 memory clip 不保证请求完成" | E4 | `[文档]` known limitations + design §checkpoint retention bound |
| B10 | `--max-running-requests` 仍预留固定请求槽，未纳入统一容量模型 | E5 | 原文 §Limitations（作者自陈为下一步） |
| B11 | 可用量是估计、held 是精确；idle 时检查泄漏与字节守恒 | E4 | `[文档]` observability |

## 4. 原文未给出的信息（可复现性缺口）

1. **无方差 / 置信区间**；全部为两次运行平均，部分场景"约"数。
2. **未给调优后的分离池对照**（只与默认比例比），因此无法判断统一内存在"比例已调优"时是否仍有优势。
3. **未给压实的运行时开销**（搬移字节数、CPU/GPU 时间占比），只给了端到端吞吐。
4. **未给 harness 的规模与覆盖率数字**（seeds × ops 是示例命令，不是实测统计）。
5. **未给 pending/vacated/fenced 的实测频次**，因此无法判断这些状态在真实负载中的代价。
6. **单机单卡**，没有跨节点 / 长稳测试数据。
7. **未说明 GSM8K 0.875 的采样设置方差**（200 题、单点），精度结论强度有限。

## 5. 本文推断（标记 C）

| # | 推断 | 依据 | 风险 |
| --- | --- | --- | --- |
| C1 | 收益主要来自"消除配置错误"而非算子优化 | P2–P6 的胜出场景共性是与启动假设不符的负载 | 若流量稳定且比例已调优，收益会明显缩小 |
| C2 | SGLang 的"held/available 分离 + 决策路径告警"是低成本高收益的护栏 | B11 + M6 | 需要先有决策路径的清晰边界，否则误报多 |
| C3 | ds4 的专家缓存与 KV 可套用"不同几何 sub-pool + 按单位分配"的换手 | 我们的 SSD 分析给出专家粒度 9.49 MiB、总 142.38 GiB | 未实测；SSD 分层的瓶颈结构与 HBM 不同 |
| C4 | 随机操作序列 + 最小化失败的 stress harness 是投入产出比最高的一项 | `[文档]` 给出具体检查项与命令 | 需要先能把 allocator 从真实设备中解耦 |
