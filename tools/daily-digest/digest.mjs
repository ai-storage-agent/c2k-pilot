#!/usr/bin/env node
/**
 * Daily work-progress digest for the dsh-superagent pilot deployment.
 *
 * Reads the dsh-superagent management API (loopback only), optionally enriches
 * with GitHub pull-request state, renders a short Chinese Markdown digest of the
 * day's work, and sends it to a Feishu chat as the bot.
 *
 * The module is deliberately dependency-free (Node >= 22) and separates the
 * pure rendering from I/O so `digest.test.mjs` can exercise it without a live
 * service. It is designed to be run by cron once a day; see install.sh.
 *
 * Environment (all optional except DIGEST_CHAT_ID when sending):
 *   DIGEST_API_BASE     management API base   (default http://127.0.0.1:3082/orchestrator/api)
 *   DIGEST_TZ           IANA zone for the day (default Asia/Shanghai)
 *   DIGEST_CHAT_ID      Feishu chat_id (oc_...) to post to; required to send
 *   DIGEST_LARK_CLI     lark-cli or wrapper   (default lark-cli)
 *   DIGEST_GH_CLI       gh or wrapper         (default gh)
 *   DIGEST_REPO         owner/name override   (default from API state)
 *   DIGEST_DRY_RUN      "1" to render without sending
 *   DIGEST_OUT          write the Markdown to this path
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Calendar date (YYYY-MM-DD) of an instant in a zone. */
export function dayKeyIn(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** Wall-clock HH:mm of an instant in a zone. */
export function localTimeIn(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

/** Weekday label of an instant in a zone. */
export function weekdayIn(date, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)
  return { Sun: '周日', Mon: '周一', Tue: '周二', Wed: '周三', Thu: '周四', Fri: '周五', Sat: '周六' }[name] ?? name
}

/** Offset of a zone from UTC, in minutes, at a given instant. */
export function zoneOffsetMinutes(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map(part => [part.type, part.value]))
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second)
  return Math.round((asUTC - date.getTime()) / 60000)
}

/** Collapse whitespace and truncate to `max` characters with an ellipsis. */
export function shorten(text, max = 80) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/** Pull unique GitHub pull-request URLs out of free text, in order of appearance. */
export function prLinks(text) {
  const found = String(text ?? '').match(/https?:\/\/github\.com\/[^\s)\]<>"']+\/pull\/\d+/g) ?? []
  return [...new Set(found)]
}

function problemText(problem) {
  switch (problem.kind) {
    case 'setup': return `需要配置：${shorten(problem.detail ?? problem.place ?? '未说明', 120)}`
    case 'no-source': return '没有可用的来源（Source）'
    case 'no-allowed': return '允许名单为空，任何人都无法发起请求'
    case 'executor-paused': return '执行器已暂停'
    case 'source-error': return `来源 ${problem.source?.title?.zh ?? problem.source?.id ?? '?'} 异常：${shorten(problem.source?.health?.detail ?? '', 120)}`
    case 'runtime-error': return `组件 ${problem.name} 异常：${shorten(problem.detail ?? '', 120)}`
    case 'eval-overdue': return `评估超时：${shorten(problem.thread?.title ?? problem.thread?.key ?? '', 80)}`
    case 'eval-unavailable': return `评估不可用：${shorten(problem.thread?.title ?? problem.thread?.key ?? '', 80)}`
    default: return shorten(JSON.stringify(problem), 120)
  }
}

function statusWord(summary) {
  if (/已合并|merged/i.test(summary ?? '')) return '已合并'
  if (/ready for human review|就绪|待.*评审/i.test(summary ?? '')) return '待评审'
  if (/blocked|受阻/i.test(summary ?? '')) return '受阻'
  if (/failed|失败/i.test(summary ?? '')) return '失败'
  return '已结束'
}

function personAction(action) {
  return { review: '待评审', answer: '待答复', delivery: '待交付', blocked: '受阻', failed: '失败' }[action] ?? '待人处理'
}

/** Inline Markdown links for every pull request named in a free-text summary, prefixed by a separator. */
function prSuffix(summary) {
  const links = prLinks(summary)
  return links.length ? `　${links.map(url => `[PR #${url.split('/').pop()}](${url})`).join(' ')}` : ''
}

function ticketLine(ticket, timeZone, { withTime = false } = {}) {
  const at = withTime && ticket.updatedAt ? `（${localTimeIn(new Date(ticket.updatedAt), timeZone)}）` : ''
  return `- ${shorten(ticket.title, 70)}${at}${prSuffix(ticket.summary)}`
}

/**
 * Render the digest. Pure: all inputs come from the `data` object so tests can
 * drive every section without a live service.
 */
export function renderDigest(data) {
  const { timeZone, date, weekday, flow } = data
  const tickets = data.tickets ?? []
  const decisions = data.decisions ?? []
  const problems = data.problems ?? []
  const prs = data.prs ?? []
  const lines = [`**📋 工作进展汇总 · ${date} ${weekday}**`]

  if (problems.length) {
    lines.push('', '**⚠️ 需要注意**')
    for (const problem of problems) lines.push(`- ${problemText(problem)}`)
  }

  const done = tickets.filter(ticket => ticket.state === 'ended' && ticket._today)
  if (done.length) {
    lines.push('', `**✅ 已完成（${done.length}）**`)
    for (const ticket of done) lines.push(`- ${shorten(ticket.title, 70)} — ${statusWord(ticket.summary)}${prSuffix(ticket.summary)}`)
  }

  const person = tickets.filter(ticket => ticket.state !== 'ended' && ticket.stage === 'person' && ticket._today)
  if (person.length) {
    lines.push('', `**👤 待人工处理（${person.length}）**`)
    for (const ticket of person) lines.push(`- ${shorten(ticket.title, 70)}（${personAction(ticket.action)}）${prSuffix(ticket.summary)}`)
  }

  const active = tickets.filter(ticket => ticket.state !== 'ended' && ticket.stage !== 'person' && ticket._today)
  if (active.length) {
    lines.push('', `**🔄 进行中（${active.length}）**`)
    for (const ticket of active) lines.push(ticketLine(ticket, timeZone))
  }

  const todayDecisions = decisions.filter(decision => dayKeyIn(new Date(decision.at), timeZone) === date)
  if (todayDecisions.length) {
    const accepted = todayDecisions.filter(decision => decision.outcome === 'accept').length
    const names = todayDecisions.filter(decision => decision.outcome === 'accept')
      .map(decision => shorten(decision.ticketTitle || decision.preview || '', 40)).filter(Boolean)
    lines.push('', `**📨 今日请求（${todayDecisions.length}）：接受 ${accepted}、忽略 ${todayDecisions.length - accepted}**`)
    for (const name of [...new Set(names)]) lines.push(`- ${name}`)
  }

  const mergedToday = prs.filter(pr => pr.mergedAt && dayKeyIn(new Date(pr.mergedAt), timeZone) === date)
  const openedToday = prs.filter(pr => dayKeyIn(new Date(pr.createdAt), timeZone) === date)
  if (mergedToday.length || openedToday.length) {
    lines.push('', '**🔀 仓库 PR**')
    if (mergedToday.length) lines.push(`- 今日合并 ${mergedToday.length}：[${mergedToday.map(pr => `#${pr.number}`).join(' ')}]`)
    if (openedToday.length) lines.push(`- 今日新建 ${openedToday.length}：[${openedToday.map(pr => `#${pr.number}`).join(' ')}]`)
  }

  if (flow) {
    lines.push('', `_近 24 小时：触发 ${flow.triggers}、判定 ${flow.judged}、接受 ${flow.accepted}、评估中 ${flow.evaluating}、丢弃 ${flow.dropped}_`)
  }

  if (!done.length && !person.length && !active.length) lines.push('', '今天没有工单活动。')
  return `${lines.join('\n').trim()}\n`
}

async function api(base, path) {
  const response = await fetch(`${base}/${path}`, { headers: { 'x-orchestrator-request': '1' } })
  if (!response.ok) throw new Error(`GET ${path} -> HTTP ${response.status}`)
  return response.json()
}

function listPullRequests(cli, repo, timeoutMs = 45000) {
  if (!repo) return []
  try {
    const raw = execFileSync(cli, ['pr', 'list', '--repo', repo, '--state', 'all', '--limit', '50',
      '--json', 'number,title,state,createdAt,mergedAt,url'], { encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'ignore'] })
    return JSON.parse(raw)
  } catch {
    return []
  }
}

/** Gather every input the digest needs from the management API and GitHub. */
export async function collectDigest({ apiBase, timeZone, ghCli, repo }) {
  const [state, overview, open, ended, decisions] = await Promise.all([
    api(apiBase, 'state'),
    api(apiBase, 'overview'),
    api(apiBase, 'tickets?state=open&limit=1000'),
    api(apiBase, 'tickets?state=ended&limit=1000'),
    api(apiBase, 'decisions?limit=200'),
  ])
  const now = new Date()
  const date = dayKeyIn(now, timeZone)
  const tickets = [...(open.items ?? []), ...(ended.items ?? [])].map(ticket => ({
    id: ticket.id, title: ticket.title, state: ticket.state, stage: ticket.stage, action: ticket.action,
    summary: ticket.summary, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt,
    _today: [ticket.createdAt, ticket.updatedAt].some(value => value && dayKeyIn(new Date(value), timeZone) === date),
  }))
  const resolvedRepo = repo || state?.setup?.accounts?.repository || ''
  return {
    timeZone, date, weekday: weekdayIn(now, timeZone), tickets,
    decisions: decisions.items ?? [],
    flow: overview?.flow,
    problems: overview?.problems ?? [],
    prs: listPullRequests(ghCli, resolvedRepo),
  }
}

function sendFeishu(larkCli, chatId, markdown, idempotencyKey) {
  return execFileSync(larkCli, ['im', '+messages-send', '--chat-id', chatId, '--markdown', markdown,
    '--idempotency-key', idempotencyKey], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] })
}

function usage() {
  return 'usage: digest.mjs [--dry-run] [--json] [--out <file>] [--send]\n'
    + '  default: render and send to DIGEST_CHAT_ID\n'
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) { process.stdout.write(usage()); return 0 }
  const dryRun = argv.includes('--dry-run') || process.env.DIGEST_DRY_RUN === '1'
  const asJson = argv.includes('--json')
  const outIndex = argv.indexOf('--out')
  const out = outIndex >= 0 ? argv[outIndex + 1] : process.env.DIGEST_OUT
  const timeZone = process.env.DIGEST_TZ || 'Asia/Shanghai'
  const apiBase = process.env.DIGEST_API_BASE || 'http://127.0.0.1:3082/orchestrator/api'
  const chatId = process.env.DIGEST_CHAT_ID || ''
  const larkCli = process.env.DIGEST_LARK_CLI || 'lark-cli'
  const ghCli = process.env.DIGEST_GH_CLI || 'gh'

  const data = await collectDigest({ apiBase, timeZone, ghCli, repo: process.env.DIGEST_REPO || '' })
  const markdown = renderDigest(data)
  if (asJson) process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
  if (out) writeFileSync(out, markdown)
  if (dryRun) { process.stdout.write(`${markdown}\n[dry-run] not sent\n`); return 0 }

  if (!chatId) throw new Error('DIGEST_CHAT_ID is required to send (or pass --dry-run)')
  const result = sendFeishu(larkCli, chatId, markdown, `dsh-daily-digest-${data.date}`)
  process.stdout.write(`${result}\n${markdown}`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(code => process.exit(code)).catch(error => { process.stderr.write(`${error.stack ?? error}\n`); process.exit(1) })
}
