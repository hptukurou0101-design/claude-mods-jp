import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRun, SkillUse } from '../types'

const PANE = 'work-status'
const TITLE = '作業状況'

const skills = atom({ plugin: 'work-status', key: 'skills' } as const, [])
const agents = atom({ plugin: 'work-status', key: 'agents' } as const, [])
const sessionStartedAt = atom({ plugin: 'work-status', key: 'sessionStartedAt' } as const, 0)
const turnStartedAt = atom({ plugin: 'work-status', key: 'turnStartedAt' } as const, null)

// claude-opus-5-5 → Opus 5.5
export const modelLabel = (id: string): string => {
  const m = id.match(/(opus|sonnet|haiku|fable)-(\d+)(?:-(\d+))?/i)
  const family = m?.[1]
  if (!m || !family) return id
  const name = family.charAt(0).toUpperCase() + family.slice(1).toLowerCase()
  return m[3] ? `${name} ${m[2]}.${m[3]}` : `${name} ${m[2]}`
}

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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, sessionStartedAt, v => v || now)
    await $.command.register({
      name: 'work-status',
      description: '作業状況パネル（スキル・サブエージェント・モデル・経過時間）を開く',
    })
    void $.ui.open({ id: PANE, title: TITLE })
    // 経過時間を1秒ごとに描き直す
    $.clock.every(1000, () => $.ui.invalidate('ui.render'))

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
      </Box>
    )
  })
}
