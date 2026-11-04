#!/usr/bin/env node
/** Unit tests for the pure helpers and rendering of digest.mjs. Run: node --test tools/daily-digest/ */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayKeyIn, weekdayIn, zoneOffsetMinutes, shorten, prLinks, renderDigest } from './digest.mjs'

test('dayKeyIn uses the requested zone', () => {
  const at = new Date('2026-11-04T12:30:00Z') // 20:30 Asia/Shanghai
  assert.equal(dayKeyIn(at, 'Asia/Shanghai'), '2026-11-04')
  assert.equal(dayKeyIn(at, 'UTC'), '2026-11-04')
  // 2026-11-04T18:00Z is already 2026-11-05 in Shanghai.
  assert.equal(dayKeyIn(new Date('2026-11-04T18:00:00Z'), 'Asia/Shanghai'), '2026-11-05')
  assert.equal(dayKeyIn(new Date('2026-11-04T18:00:00Z'), 'UTC'), '2026-11-04')
})

test('Asia/Shanghai has no daylight saving (UTC+8 all year)', () => {
  assert.equal(zoneOffsetMinutes(new Date('2026-01-15T02:00:00Z'), 'Asia/Shanghai'), 480)
  assert.equal(zoneOffsetMinutes(new Date('2026-07-15T02:00:00Z'), 'Asia/Shanghai'), 480)
})

test('weekdayIn labels the local weekday', () => {
  // 2026-11-04 is a Wednesday.
  assert.equal(weekdayIn(new Date('2026-11-04T12:30:00Z'), 'Asia/Shanghai'), '周三')
})

test('shorten collapses whitespace and truncates', () => {
  assert.equal(shorten('a\n  b'), 'a b')
  assert.equal(shorten('x'.repeat(100), 10), `${'x'.repeat(9)}…`)
})

test('prLinks finds unique pull-request URLs', () => {
  const text = 'see https://github.com/o/r/pull/6 and https://github.com/o/r/pull/6 and https://github.com/o/r/pull/7'
  assert.deepEqual(prLinks(text), ['https://github.com/o/r/pull/6', 'https://github.com/o/r/pull/7'])
  assert.deepEqual(prLinks('none'), [])
})

const base = {
  timeZone: 'Asia/Shanghai', date: '2026-11-04', weekday: '周三',
  flow: { triggers: 18, judged: 11, accepted: 6, evaluating: 0, dropped: 0 },
  problems: [], decisions: [], prs: [],
}

test('renderDigest groups tickets and includes PR links', () => {
  const out = renderDigest({
    ...base,
    tickets: [
      { title: '完成调研', state: 'ended', stage: 'ended', summary: 'Merged: https://github.com/o/r/pull/5', updatedAt: '2026-11-04T10:03:00Z', _today: true },
      { title: 'AFD 分析', state: 'open', stage: 'person', action: 'review', summary: 'ready for human review https://github.com/o/r/pull/6', updatedAt: '2026-11-04T09:52:00Z', _today: true },
      { title: 'E3.S 分析', state: 'open', stage: 'person', action: 'review', summary: 'ready', updatedAt: '2026-11-04T06:18:00Z', _today: true },
    ],
  })
  assert.match(out, /工作进展汇总 · 2026-11-04 周三/)
  assert.match(out, /✅ 已完成（1）/)
  assert.match(out, /已合并/)
  assert.match(out, /\[PR #5\]\(https:\/\/github\.com\/o\/r\/pull\/5\)/)
  assert.match(out, /👤 待人工处理（2）/)
  assert.match(out, /（待评审）/)
})

test('renderDigest surfaces problems first', () => {
  const out = renderDigest({ ...base, problems: [{ kind: 'no-allowed' }, { kind: 'source-error', source: { title: { zh: '飞书' }, health: { detail: 'boom' } } }] })
  assert.match(out, /⚠️ 需要注意/)
  assert.match(out, /允许名单为空/)
  assert.match(out, /来源 飞书 异常：boom/)
})

test('renderDigest counts today decisions and today PR activity', () => {
  const out = renderDigest({
    ...base,
    decisions: [
      { at: '2026-11-04T09:35:00Z', outcome: 'accept', ticketTitle: 'AFD 分析' },
      { at: '2026-11-04T08:30:00Z', outcome: 'ignore', preview: '@bot no' },
      { at: '2026-11-03T08:30:00Z', outcome: 'accept', ticketTitle: '昨天' },
    ],
    prs: [
      { number: 5, createdAt: '2026-11-04T09:42:00Z', mergedAt: '2026-11-04T10:00:00Z' },
      { number: 6, createdAt: '2026-11-04T09:49:00Z', mergedAt: null },
    ],
  })
  assert.match(out, /📨 今日请求（2）：接受 1、忽略 1/)
  assert.match(out, /今日合并 1：\[#5\]/)
  assert.match(out, /今日新建 2：\[#5 #6\]/)
})

test('renderDigest reports an idle day', () => {
  const out = renderDigest({ ...base, flow: { triggers: 0, judged: 0, accepted: 0, evaluating: 0, dropped: 0 } })
  assert.match(out, /今天没有工单活动。/)
})
