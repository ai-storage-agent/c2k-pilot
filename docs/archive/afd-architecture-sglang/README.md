# AFD（Attention-FFN 分离）架构分析：SGLang 合入状态与设计综述

> 归档目录：`docs/archive/afd-architecture-sglang` ｜ 归档日期：2026-11-04 ｜ 性质：公开 GitHub 资料桌面研究
> 来源工单：`fa18a05a5160f647b581ce6943b87ab7` ｜ 触发请求：分析 AFD 分离架构，并确认 SGLang 是否已合入该功能（issue [sgl-project/sglang#45568](https://github.com/sgl-project/sglang/issues/45568)）

## 归档信息

| 项目 | 值 |
| --- | --- |
| 报告标题 | AFD（Attention-FFN 分离）架构分析与 SGLang 合入状态核查 |
| 归档日期 | 2026-11-04（UTC） |
| 核查快照 | SGLang `main` = `a16830deb5ea5b1e8c9874ad646f3ba95542191c`（2026-11-04T08:47:36Z） |
| 方法 | GitHub API / `gh` 只读核查：issue、PR、分支树、文件内容、review、timeline、release |
| 关联 issue | [#45568](https://github.com/sgl-project/sglang/issues/45568)（RFC，OPEN） |
| 关联 PR | [#45562](https://github.com/sgl-project/sglang/pull/45562)（完整实现，OPEN/未合入）、[#45958](https://github.com/sgl-project/sglang/pull/45958)（拆分第 1 步，OPEN/未合入） |
| 机器可读元数据 | [metadata.json](metadata.json) |

**一句话结论**：AFD 是"把 MoE 的 attention 层与路由专家（FFN）层拆到两组 GPU 上、可各自独立扩缩"的架构；该功能在 SGLang **尚未合入主干 `main`**——截至 2026-11-04，`main` 上不存在 `python/sglang/srt/afd` 目录、没有 `--afd-role`/`--afd-backend` 参数、也没有对应文档；实现仍停留在**未合并的开源 PR** [#45562](https://github.com/sgl-project/sglang/pull/45562)（完整版，1.58 万行改动，当前与 `main` 冲突）与拆分出的 [#45958](https://github.com/sgl-project/sglang/pull/45958) 中。

## 一、直接回答：SGLang 是否已合入 AFD？

**没有合入主干。** 核查证据如下（均为 2026-11-04 快照）：

| 核查项 | 结果 |
| --- | --- |
| `main` 是否存在 `python/sglang/srt/afd/` | ❌ 不存在（目录 404） |
| `main` 的 `server_args.py` 是否含 `afd` 字样 | ❌ 0 处匹配 |
| `main` 文档 `docs/docs/advanced_features/` 是否有 AFD 页 | ❌ 无 `afd_disaggregation.mdx` |
| 完整实现 PR [#45562](https://github.com/sgl-project/sglang/pull/45562) | OPEN，`mergedAt=null`，`mergeable=CONFLICTING`（DIRTY），86 文件 / +15,757 / −264 |
| 拆分第 1 步 PR [#45958](https://github.com/sgl-project/sglang/pull/45958) | OPEN，`mergedAt=null`，`mergeable=CONFLICTING`，49 文件 / +3,368 / −43 |
| 组件依赖 [DeepEP#14](https://github.com/sgl-project/DeepEP/pull/14)、[DeepGEMM#110](https://github.com/sgl-project/DeepGEMM/pull/110) | 均为 OPEN、未合入 |
| 最新 release（v0.5.23，2026-11-02） | 早于/不含 AFD 合入（`main` 当前仍无该代码） |

需要区分两类"已存在"的 AFD 代码，它们都不等于主干合入：

1. **NPU 实验性实现已合入，但进的是 vendor 分支，不是 `main`。**
   PR [#36258](https://github.com/sgl-project/sglang/pull/36258) `[NPU][AFD] Attention-FFN Disaggregation Experimental` 的 `mergedAt=2026-08-25`，但其 **base 分支是 `ifmn/npu/afd`**，不是 `main`；PR 自身也标注 *Experimental*。该分支上只有 3 个文件（`afd/__init__.py`、`afd_model.py`、`afd_type.py`）和 StepMesh 传输后端，与 `main` 相比 **behind 4537 个提交**。它是昇腾 NPU 路线的旧 PoC 适配，非 NVIDIA 主干路线。
2. **完整实现存在于作者 fork/分支上**（#45562 的 head `sglang-afd`，head SHA `932ba87c338f31888c4da8e823112ad67b0aa2fc`），以 RFC #45568 的形式在社区评审中，尚未进入 `main`。

因此，回答用户的问题：**SGLang 官方主干当前未合入 AFD；功能处于"已实现、拆分评审中"的阶段，若要在主线使用需跟踪 #45958 / #45562 的合并进度。**

## 二、RFC #45568 要点

RFC 标题 *[RFC] Attention-FFN disaggregation: design and integration plan*，作者 Fanyi Sun（`sunfanyi`），创建于 2026-10-21，状态 OPEN，无评论；提交者计划**按功能拆成一系列小 PR 逐步合入**，完整实现保留在 #45562 作为基准与复现参考。

### 2.1 动机

- 大规模 MoE 推理中，**attention 层在 decode 阶段偏 memory-bound**（受 KV cache 访问限制），**FFN/专家层偏 compute-bound**，单一并行策略难以同时最优。
- AFD 将 attention 与路由专家放到**不同 GPU 组**：多个 attention 实例（A）可共享一个 FFN 组（F）及其**路由专家权重**，从而**独立配置 attention 与专家容量**。
- 把多个 A 的 token 汇聚起来可**改善专家批处理（expert batching）**；microbatch 重叠可掩盖部分通信与远端执行延迟。收益取决于负载、资源配比与通信开销。

### 2.2 运行边界

| 边界 | 职责 |
| --- | --- |
| Attention workers（A） | 请求调度、KV cache、attention、路由、共享专家、残差处理、采样；投机解码的 draft 执行留在 A |
| FFN workers（F） | 执行路由专家并返回输出；F 不调度生成请求、不维护 KV cache |
| 启动握手 | 校验模型、专家布局、量化与拓扑兼容性；为 A/F **非对称组**协商通信与 CUDA Graph 容量；成员关系启动时固定 |
| 前向协调 | 约定执行模式、token 形状、活跃 session 与 graph 变体；Staged 后端在 F 上批处理兼容 session，Direct 后端在 A/F rank 间协调统一执行计划 |
| 模型集成 | 把路由专家执行替换为远程调用，同时保留路由、共享专家、scaling 与残差语义；microbatch 执行维护独立子状态 |

### 2.3 实现位置与并行

- 核心集中在 `python/sglang/srt/afd/`，集成点在 role-specific 加载、调度、graph 执行与模型 forward。A 与 F **各自捕获本地 CUDA Graph**（形状协调），**不跨进程共享 graph 对象**。
- 传输后端：
  - **Staged NCCL**：初始传输，仅用标准 SGLang 依赖；
  - **NVSHMEM**：新增 GPU 侧通信与同步（独立 provider）；
  - **Direct DeepEP / MegaMoE M2N**：从 A 直接路由 token 到持有专家的 F rank，减少 staged 中转；其 prefill 路径仍走 staged。
  - 可选组件按所选后端**按需加载**。
- 模型覆盖：Qwen3 MoE、DeepSeek V3/V3.2/V4、GLM-5 MoE DSA，含 EAGLE/MTP、DSpark，并可通过 A 的 decode 角色与 **PD 分离组合**。
- 初始约束：成员固定、attention 实例同构、每个 attention DP 组内 TP=1、Direct 后端要求 F 侧纯 EP。动态成员、F 侧 PP、EPLB 属于后续工作。

### 2.4 提议的 PR 拆分顺序

RFC 明确 "These capabilities are already implemented in #45562"，下表是**提交评审的顺序**，不是从零实现：

| 顺序 | 范围 | 主要评审关注 | PR |
| --- | --- | --- | --- |
| 1 | 核心 AFD 与非对称并行 | A/F 角色、加载、启动握手、NCCL 执行、容量推导、单 attention 实例的完整 prefill/decode 模型 hook | [#45958](https://github.com/sgl-project/sglang/pull/45958) |
| 2 | CUDA Graph 执行 | 协调捕获/回放、buffer 生命周期、graph bucket、无 microbatch 重叠时的 eager fallback | — |
| 3 | Decode microbatch 重叠 | 子状态、调度与执行顺序、父 graph、共享专家重叠 | — |
| 4 | 多 attention 实例共享 F | session 调度、cohort 批处理、聚合容量、NCCL compute-graph/eager 路径 | — |
| 5 | NVSHMEM 传输 | provider 并入 `sgl-kernel`、运行时隔离加载与打包、拓扑、arena buffer、同步 | — |
| 6 | Direct 执行与 DeepEP | 通用 Direct 执行计划、空闲 rank 协调、DeepEP adapter | — |
| 7 | Direct MegaMoE | 基于通用 Direct runtime 的 M2N 集成 | — |
| 8 | EAGLE/MTP 与 DSpark | 本地 draft 执行、远端 target 校验、graph/microbatch 元数据 | — |

组件侧 PR 独立并评审：[DeepEP#14](https://github.com/sgl-project/DeepEP/pull/14)（分离式 expert dispatch/combine）、[DeepGEMM#110](https://github.com/sgl-project/DeepGEMM/pull/110)（MegaMoE M2N）。

### 2.5 验证与后续工作

- 精度/性能结果绑定在**measured revisions**：SGLang `34a32688a4d29082f936a7a068e579aa7465b82c`、DeepGEMM `d52c4444086268983f9ee55ba6543b26dd509838`；**不代表中间 PR 或更新 baseline 的结果**。
- 每个拆分 PR 自带验证：graph 改动需 eager/replay 与 fallback 检查；overlap 改动需单/多 microbatch 对比；shared-F 改动需活跃/空闲 session 与容量覆盖；后端与投机改动需数值与模型输出检查；性能敏感改动给代表性 timing/throughput 对比。
- 后续路线：更多模型（Qwen3.5 MoE、DeepSeek-V4.1-Flash、GLM-5.3-Flash、Kimi K3、MiniMax M3）、量化与 kernel 扩展（FP8/MXFP4/ModelOpt NVFP4，评估 MXFP8）、异构 A/F 部署、F 侧 PP、EPLB、弹性扩缩、更广的 PD+AFD 验证、A:F 与 microbatch 容量规划指导。
- 更早的 AFD 讨论：[#9401](https://github.com/sgl-project/sglang/issues/9401)（2025-08-20 提出，2025-11-17 关闭）。

## 三、完整实现 #45562 的技术细节

- 标题 *[Feat] afd: add Attention-FFN disaggregation for MoE inference*，作者 `sunfanyi`，2026-10-21 创建，head 分支 `sglang-afd`，base `main`，20 个提交；标签含 documentation / quant / deepseek / speculative-decoding / jit-kernel / memory-pool。
- 规模：**86 文件，+15,757 / −264**；核心目录 `python/sglang/srt/afd/`（`afd_config.py`、`afd_handshake.py`、`afd_scheduler.py`、`afd_sync.py`、`dispatcher.py`、`layers.py`、`microbatch_overlap.py`、`scheduler_common.py`，以及 `comm/{base,nccl,nvshmem}.py`、`ffn/{cohort,compute,executor,scheduler}.py`、`direct_deepep.py`、`direct_megamoe.py`）。
- 集成面广：`arg_groups/fields/disagg.py`、`managers/scheduler.py`、`model_executor/*`、`layers/moe/*`、`models/{qwen2_moe,qwen3_moe,qwen3_5,deepseek_v2,deepseek_v4}.py`、投机解码 `speculative/dspark_*`、文档 `docs/docs/advanced_features/afd_disaggregation.mdx`，以及单测 `test/registered/unit/disaggregation/test_afd_{basic,wire_protocol}.py`。
- 作者在 PR 评论中给出的代表性 decode 结果（SM100/SM103，colocate → AFD，**同 TPOT 附近**，吞吐按**全部 GPU** 折算）：
  - DeepSeek-V4-Pro：**1.52×** throughput/GPU（TPOT 10.32 → 10.22 ms）；
  - Qwen3-235B-A22B-FP8：**2.68×**（14.36 → 14.30 ms）；
  - GLM-5.2-NVFP4：**1.78×**（6.87 → 6.85 ms）；
  - Qwen3.5-397B-A17B-FP8：**2.67×**（17.33 → 17.32 ms，含 M2N 内存访问优化，后者单独测得多至 3.3% 提升）。
  - 注意：这些数字绑定在作者给出的measured revisions上，**是作者自报数据，且不属于 `main` 上可复现的功能**。

## 四、拆分第 1 步 #45958 的技术细节

- 标题 *[Feat] afd: add the attention-FFN disaggregation framework*，作者 `sunfanyi`，2026-10-23 创建，head `afd-pr-01-core`，base `main`，2 个提交，**49 文件 / +3,368 / −43**。
- 内容（PR 描述摘要）：
  - A/F 角色、类型化启动握手、前向协调；校验模型/布局兼容性，并由 A 的准入上限与 rank 映射**推导 F 的 dispatch 容量**，保留原生 DeepEP 容量下限；
  - 支持 **FULL** 与 **SCATTERED** 两种布局，允许 A/F rank 数不等：FULL 把完整专家输入发给指定 F rank 并合并部分输出；SCATTERED 把 attention 分片转给 F 并用原生 DeepEP 做专家 dispatch；空 F rank 仍参与必要的集合通信；
  - 请求调度、KV cache、attention、路由、共享专家、采样留在 A；F 通过既有 MoE runner 执行路由专家，不做 attention forward、不建 KV cache；A 跳过加载 target 路由专家权重；
  - 集成 Qwen2/3 MoE 与 DeepSeek V2/V4 模型路径；初始传输为 **NCCL point-to-point**，使用独立于各实例原生进程组的 joint communicator；
  - 用法：A 配 `--afd-role attn --afd-ffn-addr <ffn-host>:<port>`，F 配 `--afd-role ffn`，请求发往 A；默认 NCCL，无需 AFD 专用组件 wheel；
  - 范围限制：eager 执行、成员固定、一个 A 对一个 F、每个 attention DP 组内 attention TP=1；CUDA Graph、microbatch overlap、多 A、其他传输、Direct 后端、投机解码留待后续 PR。
- 精度验证：SM100 + Qwen3-30B-A3B BF16，FULL A1/F2（Triton MoE）与 SCATTERED A1/F2（原生 DeepEP）两种配置，48/48 生成 token ID 与 colocated 参考一致，最大输出 logprob 差为 0；回归测试 `python test/registered/e2e/afd/test_afd_nccl.py` 注册进四卡 CI 套件。

## 五、风险、限制与观察

1. **未合入主干**：任何"sglang 已支持 AFD"的说法，目前只对作者分支/PR 成立，不对 `main` 或已发布 wheel 成立。
2. **两个 PR 均与 `main` 冲突**（`mergeable=CONFLICTING`），且 `main` 活跃（核查当日仍有提交），拆分评审实际上在追一个移动的基线。
3. **依赖组件未合入**：Direct 后端依赖 DeepEP#14、DeepGEMM#110 的 AFD 扩展；官方 wheel 当前不含 `deep_ep.afd` / `deep_gemm.mega.m2n`，NVSHMEM 走独立 provider。
4. **NPU 路线与 NVIDIA 路线不是同一套代码**：`ifmn/npu/afd` 分支上的实验实现基于 StepMesh，落后 `main` 数千提交，不要把 PR #36258 的合并状态等同于主干支持。
5. **性能数据边界**：×1.5–×2.7 的吞吐提升是作者在特定 revision、特定硬件（SM100/SM103、GB300）与特定负载下自报；是否迁移到自身环境需要重新测量，且与 A:F 配比、microbatch 数、通信后端强相关。
6. **工程约束仍在**：固定成员、attention 实例同构、TP1、Direct 纯 EP 等限制尚未解除；动态扩缩、EPLB、F 侧 PP 还在路线图上。
7. **本报告为快照**：合入状态随时可能变化，如需最新结论请重新核对 `main` 树与上述 PR 的 `mergedAt`。

## 六、对使用/跟踪的建议

- 若关注**主干可行性**：跟踪 PR [#45958](https://github.com/sgl-project/sglang/pull/45958)（第 1 步，NCCL 即可跑通）与 RFC [#45568](https://github.com/sgl-project/sglang/issues/45568) 的定点更新。
- 若想**提前评估**：使用 #45562 的 head（`932ba87c...`）+ 其指定的 DeepGEMM revision，在 SM100/SM103 上按 PR 内脚本复现；注意结果不保证与后续 `main` 兼容。
- 若做**容量规划**：以"多 A 共享 1 个 F、独立扩 attention 与 expert 容量"为主思路，先确认期望的 A:F 比与 microbatch 重叠是否覆盖通信开销。
- 若涉及**国产/异构硬件**：目前唯一已合入（vendor 分支）的 AFD 代码是 NPU 实验版，且远落后于 `main`，需要单独评估。

## 七、来源

| 资源 | 链接 | 快照状态（2026-11-04） |
| --- | --- | --- |
| RFC issue | https://github.com/sgl-project/sglang/issues/45568 | OPEN，0 评论，作者 sunfanyi |
| 完整实现 PR | https://github.com/sgl-project/sglang/pull/45562 | OPEN，CONFLICTING，86 文件 +15,757/−264 |
| 拆分第 1 步 PR | https://github.com/sgl-project/sglang/pull/45958 | OPEN，CONFLICTING，49 文件 +3,368/−43 |
| 早期 RFC | https://github.com/sgl-project/sglang/issues/9401 | CLOSED（2025-11-17） |
| NPU 实验 PR | https://github.com/sgl-project/sglang/pull/36258 | MERGED 到 `ifmn/npu/afd`（非 main） |
| 组件 PR | https://github.com/sgl-project/DeepEP/pull/14 ｜ https://github.com/sgl-project/DeepGEMM/pull/110 | 均 OPEN |
| 主干快照 | SGLang `main` = `a16830deb5ea5b1e8c9874ad646f3ba95542191c` | 无 `srt/afd`、无 afd 参数/文档 |

## 附：核查命令（可复现）

```bash
# 主干是否存在实现
gh api repos/sgl-project/sglang/contents/python/sglang/srt/afd            # 404
gh api repos/sgl-project/sglang/contents/python/sglang/srt/server_args.py?ref=main \
  | base64 -d | grep -c afd                                              # 0

# PR 合入状态
gh pr view 45562 --repo sgl-project/sglang --json state,mergedAt,mergeable,changedFiles
gh pr view 45958 --repo sgl-project/sglang --json state,mergedAt,mergeable,changedFiles
gh pr view 36258 --repo sgl-project/sglang --json state,mergedAt,baseRefName

# 组件依赖
gh pr view 14  --repo sgl-project/DeepEP   --json state,mergedAt
gh pr view 110 --repo sgl-project/DeepGEMM --json state,mergedAt
```
