# 03 · 授权、执行与交付

> 依据 `docs/002-authorization.md`、`docs/003-execution.md`、`prompts/*`、`docs/006-deployment.md` 与 `src/core/`、`src/policy.ts`、`src/executor/dsh.ts` 整理。

## 1. 两条入口：Eval 与订阅

一条 Trigger 进入系统后只有两条路：

### 路径 A：Eval（决定是否开始新工作）

Source 标记消息是否“指向智能体”（`mention` 或 `direct`）。Gate 检查发送者和该 Source 的策略：

- 名单内的人指向智能体 → **显式请求**；
- 人的跟进（Thread 上已有 Ticket）→ 按规则判断；
- 其他人类消息 → 使用该接收范围的准入表；
- Source bot 名单上的 bot → 最多产生**推断候选**，永远不能显式请求；其他 bot 不接收。

### 路径 B：Subscription（继续已有工作）

订阅 Thread 上的每条消息都会作为上下文到达订阅的 Ticket，**包括 bot 和 CI 消息**。这条投递绕过 gate，不授予新权限；Ticket 仍受 Mandate 限制。

关键区别：

| | Eval | Subscription |
| --- | --- | --- |
| 目的 | 决定是否创建新工单 | 把后续上下文送给已有工单 |
| 是否检查发送者 | 是（gate） | 否 |
| 是否授予权限 | 是（accept 创建 Mandate） | 否 |
| 人的消息 | 可能成为候选 | 若到达某个 Ticket 自己的 Thread，由该 Ticket 的 worker 决定；不经过 Eval |
| bot/CI | 只有名单内 bot 可成推断候选 | 可以到达活动工单；不唤醒已结束工单 |

## 2. Gate：谁可以发起工作

### 显式请求的条件

- 发送者在 Source 的允许名单上；
- 消息指向智能体（GitHub 的 @、Feishu 的 @ 或私聊）；
- Source 仍在监听该范围。

名单匹配大小写不敏感。`allowed` 为空时，系统无法把任何请求变成 Ticket（部署后必须配置名单）。

### 准入表

每个 Source 的 Policy 有一张准入表，行是接收范围：

- **Feishu**：每个配置的群、其他收到 @ 的群、私聊；
- **GitHub**：新 Issue、新 PR、评论、默认分支 CI。

每行最多三格，按“是否在名单上 × 是否指向智能体”决定：

| 格 | 可选值 | 默认 |
| --- | --- | --- |
| 在名单上、未指向 | inferred / ignore | inferred |
| 不在名单上、指向 | explicit / inferred / ignore | ignore |
| 不在名单上、未指向 | inferred / ignore | ignore |

- 只有 Source 接收全部消息的范围（Feishu 的“全部消息”、GitHub 打开对应 receive-all 开关）才提供“未指向”的格；
- CI 没有发送者，只有最后一格可用；
- 把“未在名单、指向”设为 explicit，可以让该范围内任何人 @ 智能体就发起工作（适合专用支持群）；
- 推断候选仍受 accept mode 限制；
- 跟进通常绕过此表，但显式格仍然授予 explicit 强度。

### bot 与自动审查

宿主把 GitHub App、以 `[bot]` 结尾的登录名、Feishu bot 识别为 bot。Source 可以列出 `dependabot[bot]` 之类允许产生推断候选的 bot；它们必须 @ 智能体，或出现在接收全部消息的范围。它们不能显式请求，也不能停止工单。

使用普通账号的自动审查者（如某些 CI 机器人）在宿主看来就是人：它的评论会到达订阅工单并产生跟进通知。团队提示词必须把这些账号标为自动审查者；这是提示词责任，不是代码识别。

## 3. 强度与接受模式

| 强度 | 情形 |
| --- | --- |
| `explicit` | 名单内的人指向智能体；或在已有 Ticket 的 Thread 上跟进；或准入表格设为 explicit |
| `inferred` | 名单外的人在已有 Ticket 的 Thread 上跟进（除非其格为 explicit）；准入表格设为 inferred；Source bot 名单上的 bot 指向智能体或在接收全部消息的范围发言 |
| `not admitted` | 其他 bot 的消息；准入表 ignore 的一切；`off` 模式下所有推断情形 |

| 模式 | 效果 |
| --- | --- |
| `off` | 推断消息不成为候选 |
| `observe`（默认） | 推断候选会被评估；正评估记为 ignore + “would accept”，不执行 |
| `auto` | 推断候选的正评估会接受 |

显式请求在所有模式下都工作。文档建议从 `observe` 开始，审查记录的 Decision，再切 `auto`。

**每条启用规则必须恰好被评估一次**，无论是否命中。主动 accept 至少需要一条命中规则。Ticket 的 Mandate 记录命中的规则，Executor 收到规则名和指令；对该 Ticket，规则的流程与沟通要求覆盖默认值（例如静默规则可以抑制确认，review 规则可以指定必须的审查者和合并前批准）。

## 4. Policy 版本与 Mandate 重新校验

Policy 版本覆盖：规则、accept mode、每个 Source 的 Policy 部分（含 bot 名单）。每次 Mandate 记录接受时的版本。

版本变化时：

- 运行中的 Eval 被丢弃，Trigger 重新排队；
- 受影响的活 Ticket 收到 policy-changed Input，说明：
  - 命中的规则变了（含新文本）或不再适用；
  - 请求者不能再发起工作；
  - 主动工作不再被接受（例如 `auto` 变回 `observe`）；
- 不受影响的 Ticket 不收到通知；
- **变更不会立即撤销活 Ticket 的 Mandate**。

Source 配置与 Policy 分开：配置控制什么进入系统（读哪些群、是否接收全部消息）；Mandate 记录 Source 和接收范围。恢复只需要 Source 仍监听该 Thread，不要求仍接收全部消息。

回复在 Source 关闭时等待；Source 不再监听目标时丢弃。

### 恢复前校验

已结束 Ticket 保留 Mandate，人的消息可以在同一 Thread 上恢复它，无需新 Eval 或 Decision。恢复前检查：

- Source 仍监听原 Thread；
- 显式跟进 Mandate → 通过；
- 推断 Mandate → 需要 `auto` 模式且命中的规则仍启用；
- 准入表授予的 Mandate → 今天的表仍至少给出原强度，且发送者成员关系仍成立（因此把某人移出名单可能撤销它）；
- bot Mandate → 该 bot 仍在 Source 的 bot 名单上；推断的表格/bot Mandate 还需要 `auto` 和启用的规则；
- 其他 Mandate → 发送者仍在允许名单上。

校验失败 → Ticket 保持结束，不接收等待中的消息；每条消息按“没有到达任何 Ticket”处理，若无其他 Ticket 拥有它，则进入 Eval。主 Session 不会被告知它到达了 worker；附着到该 Ticket 被拒绝，需要新的 accept。

## 5. 订阅、跟进与恢复

### 扇出

匹配的 Trigger 扇出给所有活动订阅工单。人的消息到达工单后：

- 该工单的 worker 决定它是否属于本工单；
- 在范围内 → 处理并用 `orchestrator_ack` 确认；
- 超出范围或属于其他工单 → `orchestrator_trigger_handback` 一次性交回，附一句原因；
- 主 Session 收到 `follow_up` 通知，但只能“按人的要求停止”，不能 accept/attach/requeue；
- 只有当没有其他 Ticket 仍拥有该消息时，它才进入新的 Eval；候选会带上 hand-back 的原因。

**交接（handoff）**：worker 交回后 Ticket 保留订阅；如果附着的 Thread 无关，worker 用 `orchestrator_thread_unrelated` 只丢弃本 Ticket 对该 Thread 的订阅，并交回它拥有的跟进。worker 从不再拥有该消息（bot 消息、已由人送去 Eval 的消息）交回时，不会排队任何东西。

### 恢复

- 已结束 Ticket 保留 Mandate 和订阅；
- 人的消息在它自己的 Thread 上恢复同一工作，无需新 Eval/Decision，不论发送者是谁；
- bot/CI 不唤醒已结束 Ticket；
- Executor 判断请求是否符合范围，不符合就结束本轮；
- 被人 stop 的 Ticket 保持结束，不再接收任何东西；那里的新工作需要新的 accept；
- 主 Session 只有在消息显式指向某 Ticket 时才把 Thread 附到该 Ticket（引用 PR/Issue/源消息/确认，或指向刚做的改动且只有一个 Ticket 匹配）；主题相似不够。

### 上下文订阅

worker 可以跟随相关 Thread（如另一个 Issue/PR）仅作上下文。消息会到达 Ticket，但不授予权限，也不让人的消息恢复已结束 Ticket，除非主 Session 显式附着一条消息。主 Session 关于其他工作的 note 同样只是上下文。

### 取消订阅

- 人可以丢弃一个 Thread 上的全部订阅（`orchestrator_thread_unsubscribe`）；
- worker 只能丢弃自己 Ticket 对某个它认为无关的附着 Thread 的订阅，不能丢弃 Ticket 起始 Thread 和 Source 让它跟随的 Thread（如它的 PR）。

## 6. 工单阶段与执行

工单阶段表见 [01-overview.md](01-overview.md#5-一个请求的完整生命周期)。这里补充执行侧机制。

### Assignment 生命周期

`pending → running → ended`，独立于 Ticket。一个 Ticket 可以有多个 Assignment：

- 首次 accept 创建第一个 Assignment；
- retry 结束当前 Assignment，在同一 Session、目录、分支、PR 上开新 Assignment；
- 重启时运行中的 Assignment 以“host restarted”结束，新 Assignment 带恢复说明；
- 只有最终报告能在 Executor 侧结束 Ticket。

### Worker slot 与并发

- 默认 `maxWorkers = 3`（可设置）；
- Ticket 从 launch（含 prepare）或从唤醒 idle worker 的投递开始持有 slot，贯穿整个 turn；
- 额外 1 个 slot 专门给人消息或状态请求；新工作不能阻止人继续已有 Ticket；
- 其他 Input（CI 结果等）等普通 slot；
- `working/queued` 表示 launch 在等 slot；launch 并发，慢 prepare 只延迟自己的工单。

### Prepare 命令

第一次 Assignment 前，若目录不存在，用 `sh` 在 execution root 执行一次 prepare，最长 10 分钟。它可以读取环境变量（不是 prompt 里的值）：

- `DSH_SUPERAGENT_DIR`、`DSH_SUPERAGENT_NAME`、`DSH_SUPERAGENT_TICKET`
- `DSH_SUPERAGENT_BLOCKED_COMMANDS`
- `DSH_SUPERAGENT_GITHUB_REPOSITORY`、`..._ACCOUNT`、`..._COMMIT_EMAIL`、`..._NUMBER`、`..._PR_HEAD`
- `DSH_SUPERAGENT_FEISHU_BOT`、`..._CHAT`

Prepare 失败 → 工单失败并记录输出；重试/人的消息会再次准备。典型命令：

```sh
git -C /home/me/src/widgets fetch --no-tags "https://github.com/$DSH_SUPERAGENT_GITHUB_REPOSITORY.git" \
  "${DSH_SUPERAGENT_GITHUB_PR_HEAD:-HEAD}:refs/dsh-superagent/$DSH_SUPERAGENT_TICKET" &&
git -C /home/me/src/widgets worktree add -b "agent/$DSH_SUPERAGENT_NAME" \
  "$DSH_SUPERAGENT_DIR" "refs/dsh-superagent/$DSH_SUPERAGENT_TICKET"
```

## 7. 失败、恢复与暂停

### 瞬时失败

模型 provider 或网络的“可传递”失败：HTTP 408、429、5xx，连接拒绝/重置/超时/DNS 失败等。

- launch 用 effect backoff，5 秒起翻倍至 300 秒，最多 3 次；
- worker turn 失败后用 15/30/60 秒的继续消息，最多 3 次；
- prepare 失败不自动重试（避免把失败命令留下的半成品目录当成已准备）；
- 其他失败直接失败工单。

### Blocked / Failed

- worker 报告 `blocked`/`failed`，或启动/运行失败（记为 `failed`）后，Ticket 不自动接收 Input；
- CI/bot 消息记录在 Ticket 上，但不投递、不唤醒；
- 工具仍然可用，人可以直接在 Session 里继续；
- 人的消息、非 blocked/failed 的后续报告、或 retry 解除 hold；
- hold 由存储的 Report/Input 推导，重启后仍在。

### Retry

在 `person / delivery`、`person / blocked`、`person / failed` 阶段可用：

- 结束当前 Assignment，在同一 Session、目录、分支、PR 上开新 Assignment，并带走等待的 Input；
- 人消息已经到达 blocked/failed Ticket 后，worker 已拥有该消息，Ticket 显示 working/queued，不再提供 retry（除非投递失败）；
- Executor 模型只在 Session 创建时应用；已有 Session 保持原模型。

### 重启

- 运行中的 Assignment 结束，新 Assignment 带恢复说明：先检查目录、git 历史、GitHub，再重复外部动作；按最旧 Ticket 优先；
- 等待/ready/blocked/failed 的 Assignment 保持，除非之后又有 Input；
- Session、目录、订阅、待投递消息、存储的工作都保留；
- “哪些消息被 Executor Session 取进历史”也持久化：claimed 且随后有 Report 或 turn 结束 → 已读；claimed 但被取消/错误截断于历史之前 → 未读；
- retry/restart 会重投被替换 Assignment 未取走的消息；Session 中已保留的副本会被移除，避免重复。

### 存储工作

“决定之后要做什么”先存后做：relay 候选/跟进/报告、launch Assignment、投递 Input。

- relay/delivery 失败 2 秒起翻倍至 1 分钟重试；
- launch 失败 → 工单失败（除非是瞬时失败）；
- 每类工作连续失败 3 次才进入系统问题；Input 投递失败显示在工单上；
- relay/notice 保序，失败会挡住同 kind 后续。

### Source 失败

- GitHub 每个 Issue/PR/Thread 独立读取：失败留在该 Thread 的 `pollError`，下次轮询重读，并计入 Source 错误；默认连续 3 次失败才报告；任何成功轮询重置计数；
- 404 也重试（私有仓库失去访问权时 GitHub 也返回 404）；
- 已通知但持续读取失败的 Issue/PR 在首次失败一天后丢弃，GitHub 报告删除时立即丢弃；读取位置不动，后续通知/轮询会补读；
- Feishu 事件消费者报告每次失败；订阅话题轮询把失败留在 Thread 上；
- 列表中的畸形项跳过并计数。

### Channel 失败

- 消息存储后发送，5 秒起翻倍至 300 秒重试；
- 同 Ticket 同会话保序；前面的消息连续失败 3 次并显示为问题后，后面的才继续；
- Source 关闭时等待；会话被删除/锁定、消息被撤回时丢弃，记录时间和原因，永不重发；
- 回复已删除的 review comment 退回 PR 会话；
- 被丢弃的确认显示为 dropped，不是 sent。

### 暂停

暂停会停止：dispatch、新 Eval、Eval 超时、Input 投递、回复。已经在跑的 launch 等恢复后继续；Source 继续记录 Trigger；运行中的 worker turn 不被打断。人的消息到已结束 Ticket 会等待；暂停结束后第一轮 pass 在 Mandate 仍有效时恢复它。进行中的 Eval 不会在暂停期间过期，deadline 按暂停时长后移。

### 无效配置

已存 Source 配置如果被 kind 拒绝，会禁用该实例，而不是让进程崩溃。

## 8. PR 生命周期与结束条件

- Ticket 在 worker 报告后跟随它起始的 PR；
- 也跟随每个从它的分支打开、由 worker 报告或 GitHub Source 发现的 PR；reopen 会重新跟随；
- Ticket 完成条件：它打开的 PR 都不再 open；如果它没有打开 PR，则它跟随的所有 PR 都关闭；
- 结束时采用最后一个相关关闭的结果（merged/closed），保留订阅，允许后续人类评论恢复；
- 关闭不会在以下情况结束 Ticket：恢复/重试/恢复中的工作未完成；worker 已接手一个在它最新一次非 progress 报告之后（或最后一次 turn 结束之后）到达的、由它决定的跟进，但此后还没有提交新的报告或结束 turn；
- 聊天 Channel 收到一条最终通知；GitHub 上 PR 自己显示结果；
- 移除 Ticket 对某个 PR 的订阅也会停止跟随该 PR。

### 合并

**宿主没有合并决策逻辑。** Auto-merge 完全由 Delivery requirements 提示词治理：

- 默认以智能体账号绝不开启 auto-merge（GitHub 把合并记在开启者名下）；
- 如果 Delivery requirements 指定了另一个账号的 merge CLI，则只在以下条件都满足时对 ticket 分支打开的 PR 开启：PR ready；增删合计 < 200 行；所需批准覆盖 head commit；如改 UI，所需批准也覆盖；
- 推送新修订前先撤销 auto-merge；review 要求变更等条件失效时也撤销；
- 没有 merge CLI → 人合并每个 PR。

## 9. 沟通与交付规则

这些规则主要写在提示词里，由宿主部分强制（回复用途、100 词上限、工具检查）：

- **确认一次，具体。** 开始实质工作前，用 `orchestrator_ack` 回一句，点名对象和预期结果；不重复触发消息，不说“我来处理”。
- **只在人需要行动或结果可用时说话。** 工作中保持安静；进度内部记录；未完成的 PR 不 announce；pending checks 没有人类动作时不发消息。
- **结果就绪才交付。** PR 存在不等于 ready、fixed、merged；必须自审、验证、CI 通过，才能报告 ready。
- **100 词是硬上限。** Feishu 回复用 Markdown 富文本；中文按分词计数；不要用长句、分号链、多段消息规避。
- **回到原对话。** IM 来源的 Ticket 在原线程交付，不等合并；GitHub 来源保留 GitHub 回复路由。
- **GitHub 消息第一行固定：** `This is by an automated agent, not a human.`
- **review 按结果处理：** 已修复并验证 → 静默 resolve；评估后不采纳 → 在原 thread 留一句事实理由；自动审查者每个 PR 最多 3 轮；不追 bot 批准。
- **给人署名：** 人审查过 PR 后，按 Delivery requirements 用 `Co-authored-by` trailer 重写 ticket 分支提交（每 PR 每人一次），并 force-with-lease 推送；不给人以外的账号署名。
- **避免重复劳动：** 如果人的分支/PR 已包含本 Ticket 的代码，立即关闭自己的 PR 并留一句指向人的 PR。
- **UI 变更需要 Before/After 证据。** PR 描述必须包含同场景、同视口、同主题的前后对比，并标明基线版本与变更版本；只有 After 不算完成。

## 10. 权限与隔离模型

这是部署前必须理解的部分：

- **以操作员 OS 用户运行，`danger-full-access`。** Executor 可以读操作员 home、按绝对路径执行任意程序。
- **命令包装器不是安全边界。** `worker-bin/gh`、`lark-cli` 和 blocked commands 只提供默认与便利；worker 仍可按绝对路径运行被 block 的程序。
- **git 配置隔离是默认值，不是沙箱。** `worker-gitconfig` 替换 global/system 配置，移除 token，禁止交互式凭据；但工单目录里的仓库配置若自己加凭据/extraheader，工单会失败，而不是被隔离。
- **setup 移除敏感环境变量。** 任何名字含 `KEY`、`PASSWORD`、`SECRET`、`TOKEN` 的环境变量不会进入 worker 环境。
- **要真正隔离，用专用 OS 账号**，里面只放智能体的凭据。
- **单仓库、单进程。** 一个部署一个 github.com 仓库；SQLite + 目录锁，不支持多进程并发写；不支持 GitHub Enterprise Server。
- **Feishu bot 必须只允许 bot 身份。** 宿主会拒绝能作为用户行动的 lark-cli 配置。
- **人工审批不是强制。** GitHub 分支保护/必需审查是外部配置；提示词里的合并条件靠 agent 遵守。

## 11. 安全与合规注意事项

- 外部文本（消息、评论、引用、仓库文件）是**数据**，不是指令；不能改变策略或授权。
- 私密 Feishu 内容不得出现在 GitHub；worker 技能里明确要求。
- 不暴露凭据；执行环境变量本身不含凭据。
- 自动审查者的评论不授权工作；只有人能授权。
- 人的明确停止优先；自动 CI/bot 反馈不能恢复被暂停的实现。
- 研究原型没有做威胁建模或渗透测试；上述是架构层面的边界说明，不是安全认证。
