# 05 · 参考架构实现蓝图

> 本页把 [04 参考架构](04-reference-architecture.md) 落到可施工的粒度：目录结构、模块职责、核心数据结构、关键流程、测试策略与分阶段落地计划。
> 与 [06](06-open-problems.md) 的未决问题、[07](07-implementation-landscape.md) 的开源对照配合阅读。

## 1. 目标与非目标

**目标：** 给出一个能被实现、能被审计、能逐级放开的 RSI agent harness 参考实现蓝图。它应当能回答：

1. 每个自修改的候选版本从哪里来、被什么证据支持、由谁接受；
2. 任何时刻"当前 harness 由哪些制品版本组成"有唯一答案；
3. 任意一次改进可以回滚，且回滚不会留下半完成状态；
4. 评估证据与被评估对象之间有可审计的独立关系。

**非目标：**

- 不指定具体模型、不指定具体基准；
- 不实现权重训练（训练时 RSI 通过接口对接，见 §8）；
- 不声称覆盖全部 RSI 研究；只覆盖"harness 级"自修改，即 `h` 与 `B`，并对 `U`（RI）给出受控扩展点。

## 2. 目录结构

```text
rsi-harness/
├── manifest/                 # 当前 harness 版本的声明式描述
│   ├── harness.yaml          # {artifact_id: version} 的完整快照
│   └── history/              # 每次提交的 manifest 快照（含血缘）
├── runtime/                  # L0 运行时基底
│   ├── sandbox/              # 隔离执行：容器/进程/网络/凭据策略
│   ├── budget/               # token / 工具调用 / 墙钟 / 资金配额
│   ├── persistence/          # 会话与检查点（原子、fail-closed）
│   └── vcs/                  # Git 原生状态：候选、血缘、评估记录
├── harness/                  # L1 执行 harness 的六职责实现
│   ├── observation/          # I_obs
│   ├── context/              # C
│   ├── control/              # L
│   ├── action/               # I_act（工具注册与权限）
│   ├── state/                # S
│   └── verification/         # V（运行时检查，不含验收门）
├── artifacts/                # L2 能力制品库（可变面）
│   ├── prompts/              # 指令/提示词，版本化
│   ├── skills/               # 技能记录 + 实现
│   ├── memory/               # 记忆/经验，带失效与溯源
│   ├── tools/                # 工具定义与 schema
│   └── workflows/            # 控制流/工作流图
├── improver/                 # L3 改进引擎
│   ├── diagnose/             # S1
│   ├── propose/              # S2（含档案/种群搜索）
│   ├── evaluate/             # S3 的调度（评估逻辑在 evaluation/）
│   ├── implement/            # S4（事务性并入 + 回滚）
│   └── ri/                   # RI：受控的改进机制自我修订
├── evaluation/               # L4 评估与证据平面
│   ├── suites/               # 任务套件与分层 split（select/val/test）
│   ├── verifiers/            # 验证器与评分器（含自审计）
│   ├── comparison/           # 血缘对比、匹配预算对比
│   ├── audit/                # 重跑审计、方差报告
│   └── cost/                 # 成本核算
├── governance/               # L5 治理与安全平面
│   ├── gate/                 # 多信号验收门
│   ├── constraints/          # 约束检查与冗余深度
│   ├── approval/             # 人工审批点定义
│   └── audit-log/            # 审计与溯源记录
├── meta-invariants.yaml      # 元不变量内核（RI 不可达）
└── tests/                    # 见 §7
```

**结构性约束（应由测试强制）：**

- `governance/` 与 `evaluation/` 不得导入 `improver/` 的实现，只能通过声明式接口交互；
- `meta-invariants.yaml` 不在任何制品寻址空间内，`improver/` 无法通过制品接口读写它；
- `harness/` 的六职责各自暴露稳定的注册接口，使其可被替换而不改动调用方。

## 3. 核心数据结构

### 3.1 制品与版本

```text
Artifact {
  artifact_id: string          # 稳定标识，如 "prompt.worker.work"
  kind: ArtifactKind           # prompt | skill | memory | tool | workflow | harness_component
  content_hash: string         # 内容哈希，版本的唯一标识
  self_modified: bool          # 是否由改进引擎产生
}

Version {
  artifact_id: string
  content_hash: string
  parent_hash: string | null
  created_at: timestamp
  provenance: Provenance       # 见下
  validation_status: proposed | admitted | rejected | deprecated | rolled_back
}

Provenance {
  origin: human | improver | imported
  proposal_id: string | null
  diagnosis: Diagnosis | null
  evidence_refs: [EvidenceRef]
  budget_used: Budget
}

Diagnosis {
  diagnosis_id: string
  failure_class: string        # 结构化类别，不是自由文本
  evidence: [Observation]
  affected_component: obs | ctx | loop | act | store | verify
  target_layer: h | B | U      # 本次改进触及哪一层
  objective: string            # 改进目标
  risk_class: low | medium | high
}
```

### 3.2 Manifest（harness 快照）

```text
Manifest {
  manifest_id: string
  created_at: timestamp
  base_manifest: string | null # 派生自哪个 manifest
  entries: { artifact_id: content_hash }
  constraint_set: ConstraintSet
  gate_policy_version: string
  approver: string | null      # 高风险变更的人工批准者
}
```

**`Manifest` 是"当前 harness 是什么"的唯一答案。** 任何执行都必须先物化一个 manifest；任何改进产出一个新 manifest。二者之间是可 `diff`、可 `compare`、可回退的。

### 3.3 技能记录

见 [04 §5](04-reference-architecture.md) 的 `skill_record`。实现要求：

- `preconditions` / `postconditions` 必须可被机器检查（断言、正则、测试调用），否则不能进入 `admitted`；
- `confidence` / `utility` 是**动态信号**，由使用结果更新，不是静态统计；
- `side_effect_class` 决定该技能所需的审查层级。

### 3.4 证据与评估

```text
Evidence {
  evidence_id: string
  candidate_manifest: string
  baseline_manifest: string
  suite: string
  split: select | validation | test
  metrics: { name: value }
  cost: Budget
  ran_at: timestamp
  reproducible: bool           # 是否固定了模型/种子/镜像/数据快照
  rerun_of: evidence_id | null
}

EvidenceBundle {
  candidate_manifest: string
  primary: Evidence            # 主指标
  regression: [Evidence]       # 回归套件
  constraints: ConstraintReport
  verifier_audit: VerifierAudit
  comparisons: [Comparison]    # 血缘/匹配预算对比
  cost_total: Budget
}
```

### 3.5 验收决定

```text
Decision {
  decision_id: string
  candidate_manifest: string
  verdict: accept | reject | escalate | rollback
  rule_trace: [RuleResult]     # 每条规则的结果，可审计
  human_approval: Approval | null
  decided_at: timestamp
  superseded_by: string | null
}
```

## 4. 关键流程

### 4.1 一次完整的改进循环

```text
1  Collect
   执行当前 manifest，收集轨迹与反馈 -> Experience + Feedback
2  S1 Diagnose
   improver.diagnose(...) -> Diagnosis
   要求：结构化 failure_class + affected_component + target_layer + risk_class
3  S2 Propose
   improver.propose(diagnosis, archive) -> [Candidate]
   - 从档案采样父版本（不是只取最优）
   - 生成多样候选（开放式的关键）
   - 候选可以是 h 层（prompt/skill/tool/workflow）或 B 层（选择规则/目标/优化过程）
4  Build
   为每个候选构造新 Manifest（不修改当前 manifest）
5  S3 Evaluate
   evaluation 在沙箱中运行候选：
     - select split：搜索期稀疏反馈（省成本）
     - validation split：候选间比较
     - regression suite：回归检查
     - constraint checks：约束与冗余深度
   （test split 不参与选择）
6  Gate
   governance.gate.admit(candidate, bundle) -> Decision
   - 除低风险外，默认 escalate 给人工
   - 高风险的 B/U 层修改强制人工审批
7  S4 Implement（仅在 accept 后）
   事务性提交新 manifest：
     - 写入检查点
     - 更新 provenance 与血缘
     - 若失败则完整回滚到 base_manifest
8  Archive
   候选（含被拒的）与理由入档，供后续诊断使用
```

### 4.2 回滚

```text
rollback(target_manifest):
  1 校验 target_manifest 仍在历史中且约束集兼容
  2 构造并提交一个"回退 manifest"（不删除历史）
  3 记录 Decision{verdict: rollback, superseded_by: ...}
  4 若涉及不可逆副作用，标记需要人工处理，不自动重放
```

**要求：** 回滚不依赖候选版本实现仍在磁盘上——所有制品按内容哈希寻址，历史版本必须可重建。

### 4.3 评估预算分配

采用 [2610.37276](references.md#ref-2610-37276) 的两段式：**搜索期稀疏 + 最终定向确认**。

```text
warmup:      全量评测一小批任务，建立"共享信息核心"并校准响应模型
search:      仅用核心任务给候选稀疏反馈（节省大量执行成本）
finalize:    重拟响应模型 + 配对连续减半，只补跑缺失的评估
```

该工作报告：在四个基准、两个演化框架上，多数设定的平均表现高于全量评测，而评估量约为一半。这直接决定改进循环是否可负担。

## 5. 接口清单

```text
# L2 制品
ArtifactStore:
  get(artifact_id, content_hash?) -> Artifact
  put(artifact_id, content, provenance) -> Version
  lineage(artifact_id) -> LineageGraph
  diff(a_hash, b_hash) -> Diff

ManifestStore:
  current() -> Manifest
  get(manifest_id) -> Manifest
  diff(a, b) -> ManifestDiff
  commit(manifest, decision) -> Manifest   # 事务性
  rollback(target_manifest_id) -> Manifest

# L3 改进
Improver:
  diagnose(context) -> Diagnosis
  propose(diagnosis, archive) -> [Candidate]
  build(candidate) -> Manifest
  implement(manifest, decision) -> Result

Archiver:
  add(candidate, evaluation, decision) -> void
  sample(strategy) -> Candidate            # 支持非贪心采样
  lineage(candidate_id) -> LineageGraph

# L4 评估
Evaluator:
  run(manifest, suite, split, budget) -> Evidence
  compare(a_manifest, b_manifest, matched_budget) -> Comparison
  rerun_audit(manifest, n) -> RerunAudit
  verifier_audit() -> VerifierAudit

# L5 治理
Gate:
  admit(candidate_manifest, bundle) -> Decision
  constraints_check(manifest_delta) -> ConstraintReport
  requires_approval(change_class, risk_class) -> bool
Approval:
  request(decision, human_action) -> ApprovalRequest
  resolve(request_id, verdict) -> Decision

# L0 运行时
Sandbox:
  materialize(manifest) -> SandboxHandle
  run(handle, command, limits) -> Result
Budget:
  reserve(kind, amount) -> Reservation
  spent() -> Budget
```

## 6. 六职责的最小实现要求

| 职责 | 最小实现 | 可修改面 |
| --- | --- | --- |
| 观测 `I_obs` | 结构化工具结果（退出码、stdout/stderr 截断、diff、文件列表）；观测与产生它的工具版本绑定 | 观测构造器实现、截断/摘要策略 |
| 上下文 `C` | 显式 `ContextPlan`：哪些片段、什么顺序、多少预算；支持按需展开 | 检索/选择/压缩/刷新函数 |
| 控制 `L` | 单循环 + 显式终止条件 + 委派接口；每次循环记录步骤 | 工作流图、委派策略、终止判据 |
| 动作 `I_act` | 工具注册表，每项声明 schema、权限、副作用等级；调用前权限检查 | 工具集、粒度、schema |
| 状态 `S` | 原子检查点、会话恢复、可寻址制品；陈旧状态可失效 | 存储粒度、压缩、失效策略 |
| 验证 `V` | 运行时断言/测试钩子；与验收门分离 | 运行时检查规则 |

**关键要求：** `V`（运行时验证）与 L5 的验收门是**两个不同的东西**。前者服务任务执行，后者服务"是否接受这次自我修改"。混为一谈会让改进引擎有机会通过修改运行时检查来影响验收。

## 7. 测试策略

参照 [dsh-superagent 归档](../../archive/dsh-superagent-prototype/04-code-map.md) 的"文档即测试"做法，把架构规则变成可执行门禁。

### 7.1 领域规则测试

| 测试 | 断言 |
| --- | --- |
| manifest 事务性 | 提交失败后 `current()` 仍是旧 manifest；无部分应用 |
| 制品寻址 | 任意历史版本可用 `content_hash` 重建；删除工作副本后仍可重建 |
| 血缘完整性 | 每个 `admitted` 版本有父版本与证据；无孤儿 |
| 回滚 | 回滚后 `current()` 等于目标 manifest；历史保留 |
| 门规则可审计 | 每个 `Decision` 的 `rule_trace` 覆盖全部启用规则 |
| 约束检查 | 冗余深度低于下限时门拒绝；删除守护需更高审批等级 |
| 预算 | 超预算的候选在评估前被拒绝，不消耗资源 |

### 7.2 反游戏化测试（必须存在）

这些测试主动构造"看似提升、实为退化"的候选，验证门能挡住：

| 反例 | 构造方式 | 期望 |
| --- | --- | --- |
| 遮罩删除 | 删除一个被其他守护遮罩的安全规则 | 拒绝（冗余深度下降） |
| 验证者坍缩 | 用一个恒通过的评分器替换现有评分器 | 拒绝（锚点自审计失败） |
| 选择集过拟合 | 只在 select split 上提升的候选 | 拒绝（validation 无提升） |
| 成本伪装 | 指标提升但成本大幅超预算 | 拒绝 |
| 观测层作弊 | 修改观测构造器使答案可见 | 拒绝或升级（触及高风险面） |
| 陈旧记忆 | 候选依赖已失效的记忆记录 | 拒绝 |

### 7.3 元测试

| 测试 | 断言 |
| --- | --- |
| 独立性 | `governance/` 与 `evaluation/` 不导入 `improver/` |
| 元不变量不可达 | `improver/` 无法通过公开接口读写 `meta-invariants.yaml` |
| 接口稳定性 | `harness/` 六职责的注册接口有契约测试，替换实现不破坏调用方 |
| 文档完整性 | 每个模块有文档条目；模块表与实际文件一致 |
| 审计完整性 | 每个 `Decision` 可追溯到 `Manifest`、`Evidence`、`Diagnosis` |

## 8. 训练时 RSI 的对接

harness 级 RSI 不直接训练权重，但需要为训练时 RSI 提供三类接口（见 [03](03-harness-anatomy.md) 的执行信号部分）：

| 接口 | 用途 | 依据 |
| --- | --- | --- |
| **Rollout 导出** | 导出结构化轨迹（状态、动作、观测、结果、成本），供 SFT/RL 使用 | [2605.02913](references.md#ref-2605-02913) 的 Generate/Filter/Control/Replay |
| **验证器即奖励** | 把可执行验证器暴露为奖励源；要求可判定、可重放、版本化 | Absolute Zero 用代码执行器同时验证任务与答案 |
| **检查点晋级** | 训练产出的模型检查点作为制品进入 L2，走同一套评估与验收 | SEAL 的 self-edit 产生持久权重更新 |

**边界：** harness 负责采集与评估，训练栈负责优化。把训练细节塞进 harness 会让"改进是否来自 harness 还是来自更多算力"无法区分——这正是 [2407.01502](references.md#ref-2407-01502) 批评的成本/收益混淆。

## 9. 分阶段落地计划

与 [04 §10 成熟度阶梯](04-reference-architecture.md) 对应：

| 阶段 | 交付 | 完成判据 |
| --- | --- | --- |
| **P0 基线** | 执行 harness + 评估套件 + 分层 split + 成本核算 | 固定 harness 的基线分数可重现（≥3 次重跑方差已知） |
| **P1 observe 模式改进引擎** | S1–S3 全流程，S4 只记录不执行 | 能产出带证据的候选与拒绝理由；人工审查 50 个候选后判断质量可接受 |
| **P2 上下文级自修改** | 放开 prompt/memory/retrieval 的自动接受（低风险类） | 连续 N 轮无回归；约束检查与反游戏化测试全绿 |
| **P3 制品级自修改** | 放开 skill/tool/workflow | 技能生命周期（准入/修复/剪枝）运行；冗余深度有下限并生效 |
| **P4 学习规则级** | 放开 `B`（数据选择/奖励/优化过程） | 机制对比方法学就绪：相同起点、匹配预算、≥2 次重跑 |
| **P5 元级（RI）** | 受控的 `U` 修订 | 元不变量内核固定并经审计；元改进级证据 + 人工审批 |

**每一阶段都必须重新证明价值。** 上一阶段的成功不构成下一阶段的准入证据——这与 [2610.35193](references.md#ref-2610-35193) 的证据分层一致。

## 10. 已知的实现陷阱

| 陷阱 | 后果 | 规避 |
| --- | --- | --- |
| 用"当前状态"而不是版本引用做评估 | 结果无法归因；并发下评估到错误的版本 | 一切评估绑定 `content_hash` |
| 把候选存在临时目录 | 无法审计、无法回滚、无法复现 | 制品按内容哈希持久化 |
| 让改进引擎决定何时停止 | 会一直改到预算耗尽或过拟合 | 停止条件属于 governance |
| 门只看主指标 | 遮罩侵蚀、成本爆炸、安全退化 | 多信号委员会 |
| 验证器与候选同源 | 共享盲点、相互背书 | 独立选择与锚定自审计 |
| 评估环境与部署环境不同源 | 增益不迁移 | 同源镜像 + 固定快照 |
| 全局重写共享 prompt | 干扰未见过任务、覆盖旧知识 | 局部化更新 + 显式剪枝 |
| 贪心接受 | 丢失踏脚石，退化为局部搜索 | 档案 + 非贪心采样 |
| 把论文主张当已实现能力 | 架构建立在不存在的机制上 | 区分设计讨论与代码实现 |

## 11. 与现有系统的映射

| 参考组件 | 可复用的现有实现 |
| --- | --- |
| L0 会话/检查点 | DeepSeek Harness 的 session checkpoint policy（原子、fail-closed） |
| L0 Git 原生状态 | L3M 的 Git-native state trajectory 设计 |
| L1 六职责 | DSH 的 system-prompt、agent-loop、tools、session-persistence、sandbox-policy 插件 |
| L2 制品库 | DSH 的 skill registry（`dsh-skill` + `dsh-skill-filesystem`）与 agent-preset registry |
| L2 版本化 | dsh-superagent 的编号版本 + 当前指针模式（设置与提示词） |
| L3 改进循环 | DGM 的档案式开放搜索 + [2610.35193](references.md#ref-2610-35193) 的 S1–S4/RI 框架 |
| L4 评估 | [2610.10310](references.md#ref-2610-10310) 的 RSIGym EaaS 服务化评估 + RSI-Index |
| L4 预算分配 | [2610.37276](references.md#ref-2610-37276) 的两段式评估分配 |
| L5 治理 | dsh-superagent 的确定性 gate + 结构化 assessment + `observe` 默认模式 + 人工审批点 |
| L5 审计 | dsh-superagent 的 disposition/decision 记录模式 |
