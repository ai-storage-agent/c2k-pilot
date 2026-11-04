# daily-digest — 每天 20:30 的工作进展汇总

把 dsh-superagent 当天的工作进展渲染成一条简短的中文 Markdown，并作为机器人发送到指定飞书群。
对应需求：**每天晚上 8:30 总结一下这一天的工作进展**。

## 它做什么

`digest.mjs` 读取本机 dsh-superagent 的管理 API（只监听回环地址），可选地用 `gh` 补充仓库 PR 状态，
然后按当天（默认 `Asia/Shanghai`）筛选并渲染：

- **⚠️ 需要注意**：`GET overview` 报告的系统问题（setup 缺失、来源异常、执行器暂停、评估超时等）；
- **✅ 已完成**：当天结束的工单，带 PR 链接与合并状态；
- **👤 待人工处理**：等待人工评审 / 答复 / 交付的工单；
- **🔄 进行中**：仍在执行的工单；
- **📨 今日请求**：当天的判定数量（接受 / 忽略）与被接受的请求；
- **🔀 仓库 PR**：当天新建与合并的 PR 编号；
- 一行近 24 小时的触发 / 判定 / 接受统计。

没有任何活动时只输出一句「今天没有工单活动。」，不产生噪音。

## 安装

```sh
DIGEST_CHAT_ID=oc_xxx tools/daily-digest/install.sh
```

`install.sh` 会把 `digest.mjs` 复制到稳定目录
`~/.dsh/state/superagent/daily-digest/digest.mjs`（工单 worktree 被删除后任务仍然可用），
再写入/替换一条打有 `# dsh-daily-digest` 标记的 crontab 记录，保留其它无关记录。
改完 `digest.mjs` 后重新运行一次即可刷新。

### 为什么是 `30 12 * * *`

本机时钟是 UTC，且 Debian 的 cron（`cron 3.0pl1-200ubuntu1`）**不识别** crontab 里的
`TZ=` 或 `CRON_TZ=`（两种写法都实测不生效）。`Asia/Shanghai` 是 UTC+8 且不实行夏令时，
所以 20:30 北京时间 = **12:30 UTC**。安装脚本用 `DIGEST_TZ` 把时区语义固定在脚本里，
crontab 只表达 UTC 时刻。换时区时同时改 `DIGEST_CRON` 与 `DIGEST_TZ`。

### 安装脚本环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DIGEST_CHAT_ID` | 必填 | 目标群 `oc_...` |
| `DIGEST_CRON` | `30 12 * * *` | UTC 下的 cron 表达式 |
| `DIGEST_HOME` | `$HOME` | 部署 home |
| `DIGEST_DEPLOY_DIR` | `$DIGEST_HOME/.dsh/state/superagent/daily-digest` | 脚本部署目录 |
| `DIGEST_NODE` | `/usr/bin/node` | node 可执行文件 |
| `DIGEST_LARK_CLI` | `$DIGEST_HOME/.local/bin/lark-bot` | 机器人 CLI（`lark-bot` 包装脚本固定了 bot 身份） |
| `DIGEST_GH_CLI` | `$DIGEST_HOME/.local/bin/gh-agent` | PR 状态用的 gh 包装脚本 |
| `DIGEST_REPO` | 由 API state 推断 | 覆盖 `owner/name` |
| `DIGEST_DRY_RUN` | `0` | `1` 只打印将写入的记录，不安装 |

## 运行

```sh
# 渲染但不发送（默认读取本机 API）
DIGEST_DRY_RUN=1 node tools/daily-digest/digest.mjs

# 输出机器可读的采集结果
DIGEST_DRY_RUN=1 node tools/daily-digest/digest.mjs --json

# 写入文件
DIGEST_DRY_RUN=1 node tools/daily-digest/digest.mjs --out /tmp/digest.md
```

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DIGEST_API_BASE` | `http://127.0.0.1:3082/orchestrator/api` | 管理 API 根地址 |
| `DIGEST_TZ` | `Asia/Shanghai` | 判定“当天”的时区 |
| `DIGEST_CHAT_ID` | 空（发送时必填） | 目标群 |
| `DIGEST_LARK_CLI` | `lark-cli` | 发送用的 CLI |
| `DIGEST_GH_CLI` | `gh` | PR 查询用的 CLI |
| `DIGEST_REPO` | 由 API state 推断 | 覆盖仓库 |
| `DIGEST_DRY_RUN` | 空 | `1` 渲染但不发送 |
| `DIGEST_OUT` | 空 | 额外写入的 Markdown 路径 |

发送使用 `--idempotency-key dsh-daily-digest-<日期>`，同一天重复运行不会重复发消息。

## 测试

```sh
node --test tools/daily-digest/digest.test.mjs
```

单元测试只覆盖纯函数与渲染（时区换算、PR 链接抽取、各分组的取舍与空白天数），
不依赖运行中的服务、网络或飞书。

## 边界

- 依赖本机管理 API 与 bot 凭据；cron 环境是空环境，`install.sh` 已显式设置 `PATH` 与 `HOME`。
- `gh` 不可用时只跳过 PR 分组，其它内容照常发送。
- 管理 API 不可用时脚本以非零退出，错误写入 `~/.dsh/state/superagent/daily-digest.log`，不会发出半截汇总。
- 判定“当天”用 `createdAt`/`updatedAt`；跨天仍在进行的工单会在当天再次出现，这是有意为之。
