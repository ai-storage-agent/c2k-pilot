# 01 原文逐节解析

> 对象：LMSYS Org blog, *Unified Memory in SGLang: One Arena for Every Token Lifetime*（2026-11-11），作者 Cheng Wan, Caihua Li, Yonghao Zhuang, Seokwoo Song, Shuwen Wang, Lianmin Zheng。
> 说明：本文按原文小节顺序解析；`[文档]` 标记官方 SGLang 文档补充的事实，`[推断]` / `[C]` 标记本文推断。原文数字均为作者自报，未由我们复现。

## 0. 一句话与 TL;DR

原文 TL;DR 的四条主张：**一个 arena（无分区旋钮）、任意 page size 且零碎片、每 token 一个 KV entry、一套端到端内存系统**。它把这三类状态——full-attention KV、sliding-window KV、recurrent state——从"启动时按比例切死的子池（sub-pool）"改成"一个 arena 里按需求生长的 band"。

原文明确指出这是一个 **single-flag 的功能**：`--enable-unified-memory`；内存大盘仍由 `--mem-fraction-static` / `--max-total-tokens` 定，并发仍由 `--max-running-requests` 界。

## 1. 问题：混合模型与内存切分

原文先区分三种状态及其需求驱动因素：

| 状态 | 保留什么 | 需求由什么驱动 |
| --- | --- | --- |
| Full-attention KV | 整个上下文 | 序列长度 × full-attention 层数 |
| Sliding-window KV | 上下文的一个有界后缀 | 序列长度（到窗口为止）× window 层数 |
| Recurrent state | 每运行请求一个固定大小状态 | 并发数，而非上下文长度 |

**关键论点：三者的需求不同步。** 长上下文负载撑爆 full-attention 池，而 bounded 池大量空闲；大量短并发请求反之。甚至在**单个请求内部**压力也会迁移：state slot 在请求开始时就被占用，而 full-attention KV 持续增长。

SGLang 默认给每类状态一个独立 sub-pool，并在启动时用 `--swa-full-tokens-ratio`、`--mamba-full-memory-ratio` 固定比例。原文的批评是：**正确比例取决于你还不知道的流量**；选错后空闲字节存在，但"另一个池不允许使用它们"，只能靠 profiling 猜，流量一变就被早先的猜测困住。

原文把 sub-pool 的分配单位定义为 *unit*：一个 KV page，或一个 recurrent state slot。每个 sub-pool 的 unit 大小由其层决定。

## 2. 机制一：一个 arena 取代分区

统一内存用一个 arena：**full KV 占高端向下长，bounded state 占低端向上长，惰性压实（lazy compaction）把活数据推向两端**，于是中间的免费字节形成**一个不属于任何 sub-pool 的区域**，两侧各按自己的 unit 大小取用。比例参数保留但"只是 boot-sizing target，不是运行时的墙"。

原文对"零碎片"的论证值得注意：内存按整页发放，所以一个请求释放的页可被下一个请求完整复用；**压实只搬移免费字节到需要的 sub-pool**。Figure 1/2 用同一字节尺度对比两种负载下两种布局的搁浅情况（见 [data/figures.md](data/figures.md) 的 `aria-label` 全文）。

原文强调 arena 是**字节区域，不是同一尺寸页的均匀数组**：full-attention page 与 recurrent-state slot 可以相差很大，任何一方都不该把需求向上取整到对方的分配单位。sub-pool 占据 arena 的一段连续 **band**；两个端 band 向内生长，中间的是可搬移的 **floating band**。band 的生长、收缩、压实与重定位"改变谁能用免费字节，而不改变请求数据的寻址"。

原文用三个模型示例说明可组合性：GPT-OSS / Muse Spark 交错 full 与 sliding-window；Qwen3.5 交错 full 与 linear attention；Kimi K3 用 KDA linear attention + MLA，K3.1 用 DSA 替换 MLA 层。**三种状态同时存在时（Inkling）也只是组合，没有专门的 full+Mamba+SWA allocator**——这一句是设计立场声明：新增状态组合应写成声明，而非新 allocator。

## 3. 机制二：每 token 一个 entry 的 KV 布局

分离池每个层一个 buffer；统一内存把**一个 token（或一个 state slot）跨所有层的行打包进一个 entry**，一个 page 是一串 entry。于是"分配、驱逐或整页搬移一次作用于所有层"，而每层的视图按 entry 跨步（stride）。

**每类行的 shape 与 dtype 可不同**：state entry 以各自 dtype 保存 conv 与 temporal state；融合 draft 的行与 target 的 K/V 并排。这正是**投机解码 draft 的 KV 能放进 target entry 的额外 lane** 的原因——draft 行与 target 行尺寸、dtype 都可不同。target 与 draft 共享 token id，一次分配/释放/整页搬移同时带走两者。

原文给出的**具体需求例证**是 K3.1：DSA 层每个 token 有一个 top-k index 紧邻其 MLA KV，设计把两者融进同一个 buffer，于是 index 与它指向的 KV 同生共死。

## 4. 机制三：一个 arena，不同分配几何

原文承认"把两个 tensor 放进同一个 device buffer 很容易，让它们的容量可互换更难"。arena 因此是字节区域：page 与 slot 共享同一批字节，但不共享几何。

布局规则：sub-pool 占连续 band；bounded state 从低端向上长、full KV 从高端向下长；当一个 sub-pool 夹在两端之间时，它是可移动的 floating band。**活 band 的存储永不重叠**；band 的生长/收缩/压实/重定位改变"谁可以使用免费字节"，而不改变请求数据的寻址。

第三个状态的组合示例是 Inkling（full attention + sliding-window + 每请求 convolution state）：planner 建 full-KV、window、state 三个 sub-pool，各有自己的生命周期与分配单位；它们的 band 拥有互不相交的字节，"没有特殊的 full+Mamba+SWA allocator，这是组合的一个例子，不是第三种内存模型"。

**Request-scoped state：** arena 支撑的 state entry 可以承载比通常 recurrent tensor 更多的东西。例如 linear-attention ReplaySSM（GDN 与 KDA）为回放 recurrent state 保留的每请求 ring buffer，在投机解码与普通 decode 中都是 state entry 的额外 payload，与 state 共用分配与搬移模型，而不需要单独池。原文由此提出更大的方向：**模型状态与请求状态可以由一套内存系统声明和管理，而不是每个 feature 一个 allocator**。

## 5. 机制四：admission——整个请求放得下吗？

原文先纠正一个直觉：**共享字节不把请求足迹简化为 full-attention token 数**。例：32K-token 请求配 4K sliding window，64-token 页下稳态足迹是 512 个 full-KV 页 + 64 个 window 页；recurrent-state 模型还要加一个运行中请求的 state slot。window 可能临时保留超出稳态上界的行，直到 retire 或后续 recurrent checkpoint，所以 allocator 要定价**它实际必须支撑的联合需求**，而非理想化的最终足迹。

**同一个需求计算服务五处**：限制生成长度的 memory clip、prefill admission 与跨 chunk 的继续承诺、PD decode 预分配。它包含页取整与预期 decode allowance，在精确峰值未知处使用保守上界。

但"总需求算对"还不够：**arena 必须有能供应它的布局**。每个 band 有洞（band 内空闲页）与 frontier（已发放到的外缘）。host 侧快照驱动三级重排搜索：

1. **No move**：复用洞并就地扩展一个 band；
2. **Compact the ends**：压实两个端 band 释放其洞；
3. **Relayout**：再重定位夹在压实端之间的 floating band。

Figure 4 的具体例子：state 是低端、full KV 是高端、window 浮在中间。full-KV band 有三个单页洞但 frontier 处无空闲，所以三个洞无法供应四页需求；压实 full-KV 端把洞变成 window 旁的 3 页空隙，仍差一页；window 自己的洞仍在，因为**压实端不碰 floating band**。relayout 移动 floating band 的内缘：把页从该缘拷进 band 自己的洞，缘后退，释放的字节加入空隙。此处一个 window 页（按两个整页宽绘制）搬进 window 的洞，为五个 full-KV 页腾出位置：四页服务需求，一页留空。**这个阶梯只做需求所需的搬移量。**

原文还区分**可行性（feasibility）与实现（realization）**：可行性问"是否存在某个布局能服务需求"，它认为每一页都可移动（pending 页可 settle、transfer 可最终完成）；realization 先试当前布局，再找具体计划，**尽量让固定页留在原地、避免活跃网络传输**。可行性为正是"allocator 能实现该需求"的承诺，而不是"在每一个未完成 reader 或 transfer 上阻塞"的决定。

**跨设备扩展：** 在 pipeline parallelism 下，各 stage 在 pipeline loop 启动时交换 arena 几何；此后每个 stage 从相同的逻辑请求数模拟所有 stage，只接纳在所有 stage 上都放得下的需求，**而不需要每次决策都交换容量**。

## 6. 机制五：在途工作中保持页安全

若没有设备工作仍在使用，搬字节会很简单。请求表保存**虚拟 id 而非物理页号**；sub-pool 把每个虚拟 id 映射到当前物理页。搬移拷贝字节并重定向映射；下一次迭代把虚拟 id 翻译成物理页，因此**请求行不需要改写**。

难点是**时间**。SGLang 的 overlap scheduler 在 step N 的 forward 仍在运行时，就在 schedule stream 上准备 step N+1。有三种需要保持安全的情况（原文表述）：

| 情况 | 处理规则 |
| --- | --- |
| **Free with an old reader** | 释放逻辑上立即生效（页立即计入容量），但其物理字节在 forward 被处理或 settle 前不可覆写（stream 等其 event） |
| **Move with an old reader** | 搬移无需等待：allocator 拷贝并重映射；新 forward 在拷贝后解析到目的地，而已启动的 reader 可继续读旧源。只有**源**的复用/覆写必须等旧 reader |
| **Move with an old writer** | writer 必须排在拷贝之前，否则目的地可能含陈旧数据，且旧 writer 可能污染源的下一个 owner。机会式搬移避开这种源；必须的搬移先等待 |

**规则是：逻辑释放立即，物理复用等待。** 一个在未处理 forward 下被释放的页变成 pending（无论该 forward 可能读、写还是两者）；只有在该 forward 被处理或其 event 被等待后才成为普通洞。"普通释放没有单独的只读快速路径。"

原文给出四状态加两种保护（Figure 5）：

| 状态 / 保护 | 含义 | 字节何时可复用或写入 |
| --- | --- | --- |
| Beyond frontier | 所有 band 之外的字节 | band 生长过来时 |
| Hole | band 内可复用的空闲页 | 可立即供新 writer 使用 |
| Live | 持有请求数据 | 被释放或搬移 |
| Pending | 在 forward 可能仍读写它时逻辑上已释放 | forward 被处理或 settle |
| **Vacated**（源保护） | 已搬移的源，其旧 reader 可能仍读 | 旧 reader 结束 |
| **Fenced**（源保护） | frontier 后退后的旧字节，存在未完成读 | 下一个 writer 先等 fence |

搬移让目的地在 remap 期间保持 live，新 reader 只在拷贝排到它们之前后才消费；旧源保持被保护以防过早复用。**Vacated 与 Fenced 是源侧保护，不是目的地的状态。**

**保持安全的实现手段是记账与排序，不是全局停顿**：内存系统用 logical progress 让各 rank 保持一致，用 focused tests 与 seeded stress harness 以模拟和真实 CUDA 工作检验这些规则。

## 7. 机制六：一套内存系统，三个接口

原文把所有机制收敛到**三个接口**（Figure 6），这也是最值得独立记忆的设计：

1. **模型声明 state，一个 plan 建 arena。** 模型**不申请 pool**；每个层声明自己的部件，每个部件说明存什么（shape/dtype，如 K、V 行或 recurrent state）与活多久（整个上下文 / 有界窗口 / 请求的 recurrent state）。一个 storage plan 把所有层以及融合 draft 的声明变成 sub-pool、尺寸与 band，同时预算不进入可搬移 arena 的存储（每请求行、captured workspace）。**支持新的状态组合 = 写新声明，而不是写新 allocator。**
2. **每个容量问题都同一种问法。** prefill admission、decode headroom、HiCache load-back、PD 预分配、前缀缓存淘汰**都问 allocator 整个 demand 放不放得下**（full-attention token + 每个 window 的 token + state slot，合在一起）；若当前布局不行，就搜一个能行的。**单 sub-pool 的空闲字节数只用于日志与指标**，且有一个 check mode 会标出任何读取它的决策。淘汰用同一个测试：cache 自己决定淘汰顺序，allocator 说何时放得下；需求已放得下、或即使清空所有缓存项也放不下时都不淘汰；命中后即停，并计入该 victim 在其它 sub-pool 释放的量。
3. **每个页使用者都被记录。** 每个 band 维护 page-use ledger。forward、HiCache 拷贝、网络传输与页搬移各自记录它读/写了哪些页、到何时为止。页下一次需要时，**其下一个 writer 的类型决定它等什么**：forward 无需等更早的 forward（同一 stream 上有序）；HiCache load 或 schedule stream 上的拷贝等 event；网络写没有本地 stream 排序，等 host 确认更早的网络传输结束。页 id 只有在可能仍读其旧字节的 forward 退休后才发给网络对端（因为发布 id 就让发送方开始写），decode 节点因此延迟发布。**新 feature 通过声明它碰哪些页、何时完成来加入，而不是自带同步。**

## 8. "今天它能配合什么"

原文列出的支持矩阵（`[文档]` 有更细的拒绝清单）：

| Feature | 与统一内存的配合 |
| --- | --- |
| Overlap scheduler | 支持且是默认；被释放的页保持 pending 直到可能仍碰它们的 forward 被处理 |
| Radix cache | 每个 sub-pool 一个 prefix-tree slot；淘汰喂给联合 admission 决策 |
| HiCache | host pool 镜像每个 sub-pool；host 拷贝参与页排序 |
| PD disaggregation | Mooncake 传输携带整个 sub-pool entry；每个在途传输都按其触碰的页记账 |
| Speculative decoding | EAGLE / EAGLE3 / DFLASH / DSPARK + linear draft chain；兼容的融合 draft 使用 target-entry lane |
| Pipeline parallelism | 每个 stage 拥有一个 arena，并从共享逻辑计数模拟每个 stage 的容量 |
| Decode context parallelism (DCP) | 无 sliding-window 层的 MLA 模型，受 backend 限制 |
| Data-parallel attention | 每个 attention-DP rank 有自己的 arena |

限制（原文明确列出）：**PD 需要 Mooncake**，且不能与 PP、投机解码或 DCP 组合；**HiCache 不能与 EAGLE/EAGLE3 组合**。

`[文档]` 补出的拒绝清单（启动即拒）值得单独记：`--enable-two-batch-overlap`、`--enable-lmcache`/`--enable-unified-cache-external-linker`、`--enable-kv-cache-sharding`、`--enable-int8-mamba-checkpoint`、`--enable-prefill-weight-versions`、FP4 KV cache（`nvfp4` / `fp4_mx_block16`）、保留各 rank KV 分片与填充的 `--cp-kv-layout`、以及 out-of-tree 平台；MPS 与 MLX 也被拒（统一内存用 device stream 等待排序 scheduler 的写与运行中 forward 的读，而那里 scheduler 没有 device stream）。同时 `[文档]` 说明统一内存**隐含 `--enable-page-major-kv-layout`**，且 `SGLANG_DISABLE_LAZY_COMPACTION` 必须保持未设置。

## 9. 结果（作者自报）

统一内存与 SGLang 分离池在各自默认比例下对比，单台 H200/server，SGLang `daa171846f`（`[代码]` 核验：该 SHA 存在于上游，2026-11-10），模型 Qwen3.5-4B 与 GPT-OSS-20B，取两次运行平均。

| 场景 | 数字 |
| --- | --- |
| **默认无回退** | Qwen3.5-4B，1,024 in / 256 out，并发 64：5,830 vs 5,880 output tok/s；GSM8K 双方 0.875（200 题） |
| **错误比例代价（SWA）** | GPT-OSS-20B，512 in / 1,536 out，1,024 并发请求：`--swa-full-tokens-ratio 0.1` 比默认损失 12%（7,910 vs 9,030 tok/s） |
| **错误比例代价（Mamba）** | Qwen3.5-4B：`--mamba-full-memory-ratio 0.3` 把并发上限定在 24（默认 51），损失 14% |
| **无比例时能装更多** | GPT-OSS-20B 同负载：统一内存约 1,000 并发 vs 默认比例 618，吞吐 +14%，TTFT 6 s vs 43 s |
| **长上下文更多请求** | Qwen3.5-4B，16K in / 4,096 out，并发 64：32 vs 22 请求，快 26% |
| **更少 retraction** | Qwen3.5-4B，512 in / 16,384 out，并发 51：每 1,000 完成请求 retract 约 233 次 vs 默认 294；`ratio 0.3` 虽 0 次但并发被压到 24 且慢 20%（3,620 vs 4,530 tok/s） |

原文给的口径限制（重要）：**这些是作者自报、两次运行平均**；未给方差/置信区间；都是单机单卡、默认比例基线；"约 1,000 requests at once"是约数。

## 10. 局限与下一步（原文自陈）

- **仍是 experimental feature**；长期目标是"在剩余模型、后端与生命周期缺口关闭后，让它成为默认内存系统"。
- **目前只针对混合模型**：纯 full-attention、带 sliding-window 层的 MLA、**DeepSeek-V4 不支持**；其它模型与后端限制（含 **MPS、MLX**）在 usage guide。
- **Priority preemption 目前禁用**：高优先级请求先被接纳，但不会抢占运行中的请求，只会等待。
- **Window rows with recurrent checkpoints**：admission 假设 checkpoint 会推进；若没有可用的 tracking 或 replacement state slot，请求可能持有超出其定价的 window 行。
- **Startup refusals**：除上述组合外，two-batch overlap、LMCache、int8 Mamba checkpoint、FP4 KV 在启动时被拒。
- **Request slots**：`--max-running-requests` 仍预留固定请求槽数；作者希望它也跟随需求，让相关 request-row state 加入同一容量模型。

`[文档]` 的 Known limitations 与之一致，并补充了更硬的工程细节：

- **PD failed transfers**：失败或超时传输的页在其 deferred-release timeout 释放（失败 send 则立即释放），**没有证据表明远端传输引擎已停止触碰它们**。这是原文与设计文档都承认的一个未闭合安全边界。
- **Checkpoint retention bound**：`request_demand` 假设前缀树取下每个 checkpoint；当 checkpoint 停滞时 admission 上界只是估计，**"通过 memory clip 不保证请求完成"**。
- **Observability**：sub-pool 共享字节，所以 available 数字是估计，而 **held 数字是精确的**；idle 时 scheduler 检查每个 sub-pool 的泄漏与 arena 的字节守恒。
- **PP 额外限制**：每个 stage 都需要一个 full-attention 层（它拥有虚拟 id），所有 stage 必须以相同 page size 规划相同 sub-pool；`--enable-streaming-session`、`--enable-session-radix-cache` 被拒（各 stage 用自己的时钟关闭超时 session，内存可能不一致）。
- **设计文档给出的验证手段**（对我们最有借鉴价值）：`SGLANG_INVARIANT_CHECK` 三档（0 off / 1 warn / 2 strict）下的一组不变量；一个 **seeded page-safety stress harness**，在真实 `ChainAllocator` 与真实 arena 上跑随机操作序列，检查 `lost_write`、`unordered_overlap`、`host_read_after_wait`、`rank_divergence`、`cross_dtype_bytes`、`ledger_leak`；以及 allocator trace 的 record/compare 逐次对比。
