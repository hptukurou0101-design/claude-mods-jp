import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRun, SkillUse, UsdJpy } from '../types'

const PANE = 'work-status'
const TITLE = '作業状況'

const skills = atom({ plugin: 'work-status', key: 'skills' } as const, [])
const agents = atom({ plugin: 'work-status', key: 'agents' } as const, [])
const sessionStartedAt = atom({ plugin: 'work-status', key: 'sessionStartedAt' } as const, 0)
const turnStartedAt = atom({ plugin: 'work-status', key: 'turnStartedAt' } as const, null)
const tokens = atom({ plugin: 'work-status', key: 'tokens' } as const, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
const usdJpy = atom({ plugin: 'work-status', key: 'usdJpy' } as const, null)

// 欧州中央銀行の参照レート（平日1回更新・鍵不要）
const RATE_URL = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY'
const RATE_STORE_KEY = 'usdJpy'
const RATE_MAX_AGE = 24 * 60 * 60 * 1000

// claude-opus-5-5 → Opus 5.5
export const modelLabel = (id: string): string => {
  const m = id.match(/(opus|sonnet|haiku|fable)-(\d+)(?:-(\d+))?/i)
  const family = m?.[1]
  if (!m || !family) return id
  const name = family.charAt(0).toUpperCase() + family.slice(1).toLowerCase()
  return m[3] ? `${name} ${m[2]}.${m[3]}` : `${name} ${m[2]}`
}

// 1234567 → 123.5万
export const tokenLabel = (n: number): string => {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}億`
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`
  return n.toLocaleString('en-US')
}

// 1.234 → $1.23
export const usdLabel = (usd: number): string => `$${usd < 0.01 && usd > 0 ? usd.toFixed(3) : usd.toFixed(2)}`

// 0.54, 158.23 → 約85円
export const jpyLabel = (usd: number, rate: number): string => {
  const yen = usd * rate
  if (yen > 0 && yen < 1) return '1円未満'
  return `約${Math.round(yen).toLocaleString('en-US')}円`
}

// {"base":"USD","date":"2026-10-07","rates":{"JPY":158.23}} → { rate, date }
export const parseRate = (text: string): { rate: number; date: string } | null => {
  try {
    const body = JSON.parse(text) as { date?: unknown; rates?: { JPY?: unknown } }
    const rate = body.rates?.JPY
    if (typeof rate !== 'number' || !(rate > 0) || typeof body.date !== 'string') return null
    return { rate, date: body.date }
  } catch {
    return null
  }
}

const LIMIT_NAMES: Record<string, string> = {
  five_hour: '5時間',
  seven_day: '1週間',
  seven_day_opus: '1週間（Opus）',
  seven_day_sonnet: '1週間（Sonnet）',
  spend_limit: '利用上限',
}

// 2026-10-08T06:00:00Z → 10/8 15:00
export const resetLabel = (iso: string | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()} ${hm} に回復`
}

export const limitLabel = (kind: string): string => LIMIT_NAMES[kind] ?? kind

// 65000 → 1分5秒
export const duration = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}時間${m}分`
  if (m > 0) return `${m}分${sec}秒`
  return `${sec}秒`
}

// 保存済みのレートを読み、24時間より古ければ取り直す。取れなければ円は出さない
async function refreshRate($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const saved = (await $.store.get(RATE_STORE_KEY)) as UsdJpy | undefined
  if (saved) await update($, usdJpy, () => saved)
  if (saved && now - saved.fetchedAt < RATE_MAX_AGE) return
  try {
    const res = await $.http.fetch(RATE_URL)
    const parsed = res.ok ? parseRate(res.text) : null
    if (!parsed) return
    const fresh: UsdJpy = { ...parsed, fetchedAt: now }
    await $.store.set(RATE_STORE_KEY, fresh)
    await update($, usdJpy, () => fresh)
  } catch {
    // 通信できないときは前回のレート（なければドルだけ）で表示を続ける
  }
}

export const register: Register = on => {

  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, sessionStartedAt, v => v || now)
    await $.command.register({
      name: 'work-status',
      description: '作業状況パネル（スキル・サブエージェント・モデル・経過時間・使用量）を開く',
    })
    void $.ui.open({ id: PANE, title: TITLE })
    // 経過時間を1秒ごとに描き直す
    $.clock.every(1000, () => $.ui.invalidate('ui.render'))
    void refreshRate($)
    $.clock.every(60 * 60 * 1000, () => void refreshRate($))

    return next(e)
  })

  on('command.run', { command: 'work-status' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: '作業状況パネルを開きました。' }
  })

  on('prompt.submit', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, turnStartedAt, () => now)

    return next(e)
  })

  on('skill.prompt', async ($, e, next) => {
    const at = await $.clock.now()
    const one: SkillUse = { name: e.skill, at }
    await update($, skills, list => [one, ...list.filter(s => s.name !== e.skill)].slice(0, 20))

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (!result.deny) {
      const run: AgentRun = {
        id: result.agentId ?? e.tool_use_id,
        type: e.subagentType,
        description: e.description,
        model: result.model ?? e.parentModel,
        startedAt: await $.clock.now(),
        endedAt: null,
      }
      await update($, agents, list => [run, ...list].slice(0, 30))
    }

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const now = await $.clock.now()
    // サブエージェントの分も含めてセッションの合計に足す
    const u = e.usage
    if (u) {
      await update($, tokens, t => ({
        input: t.input + u.input_tokens,
        output: t.output + u.output_tokens,
        cacheRead: t.cacheRead + u.cache_read_input_tokens,
        cacheWrite: t.cacheWrite + u.cache_creation_input_tokens,
      }))
    }
    if (e.agentId) {
      await update($, agents, list =>
        list.map(a => (a.id === e.agentId && a.endedAt === null ? { ...a, endedAt: now } : a)),
      )
    } else {
      await update($, turnStartedAt, () => null)
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()
    const model = await $.session.model()
    const skillList = await read($, skills)
    const agentList = await read($, agents)
    const startedAt = await read($, sessionStartedAt)
    const turnAt = await read($, turnStartedAt)
    const tok = await read($, tokens)
    const fx = await read($, usdJpy)
    const usage = await $.session.usage()
    const ctx = usage.context
    const running = agentList.filter(a => a.endedAt === null)
    const finished = agentList.filter(a => a.endedAt !== null).slice(0, 5)

    return (
      <Box flexDirection="column">
        <Text bold>⚙ 使用スキル</Text>
        {skillList.length === 0 && <Text dimColor>  まだありません</Text>}
        {skillList.slice(0, 6).map(s => (
          <Text>  {s.name} <Text dimColor>（{duration(now - s.at)}前）</Text></Text>
        ))}
        <Text> </Text>
        <Text bold>👤 サブエージェント</Text>
        {agentList.length === 0 && <Text dimColor>  まだありません</Text>}
        {running.map(a => (
          <Text>  <Text color="yellow">● 実行中</Text> {a.type} <Text dimColor>{modelLabel(a.model)}・{duration(now - a.startedAt)}</Text>{'\n'}    {a.description}</Text>
        ))}
        {finished.map(a => (
          <Text dimColor>  ✓ 完了 {a.type} {modelLabel(a.model)}・{duration((a.endedAt ?? now) - a.startedAt)}{'\n'}    {a.description}</Text>
        ))}
        <Text> </Text>
        <Text bold>🧠 モデル</Text>
        <Text>  {modelLabel(model)}</Text>
        <Text> </Text>
        <Text bold>⏱ 経過時間</Text>
        <Text>  今の作業：{turnAt === null ? <Text dimColor>待機中</Text> : duration(now - turnAt)}</Text>
        <Text>  セッション：{duration(now - (startedAt || now))}</Text>
        <Text> </Text>
        <Text bold>📊 使用量</Text>
        <Text>
          {'  '}コンテキスト：{ctx.percent === undefined ? <Text dimColor>まだありません</Text> : `${ctx.percent}%`}
          {ctx.tokens !== undefined && <Text dimColor>（{tokenLabel(ctx.tokens)} / {tokenLabel(ctx.window)}）</Text>}
        </Text>
        <Text>  トークン：入力 {tokenLabel(tok.input + tok.cacheWrite)}・出力 {tokenLabel(tok.output)}</Text>
        <Text dimColor>    キャッシュ読み込み {tokenLabel(tok.cacheRead)}</Text>
        {usage.cost && (
          <Text>
            {'  '}料金の目安（API 換算）：{usdLabel(usage.cost.usd)}
            {fx && <Text>（{jpyLabel(usage.cost.usd, fx.rate)}）</Text>}
          </Text>
        )}
        {usage.rateLimits.length > 0 && <Text>  利用枠</Text>}
        {usage.rateLimits.map(r => (
          <Text>
            {'    '}{limitLabel(r.kind)}：<Text color={r.percentUsed >= 90 ? 'red' : r.percentUsed >= 70 ? 'yellow' : undefined}>{r.percentUsed}%</Text>
            {r.resetsAt && <Text dimColor>（{resetLabel(r.resetsAt)}）</Text>}
          </Text>
        ))}
      </Box>
    )
  })
}
