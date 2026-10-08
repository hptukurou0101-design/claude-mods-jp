import { expect, mock, test } from 'claude-code/testing'

import { duration, limitLabel, modelLabel, tokenLabel, usdLabel } from './register'

test('モデル名と時間を日本語で表す', async () => {
  expect(modelLabel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelLabel('claude-haiku-5-5')).toBe('Haiku 5.5')
  expect(modelLabel('unknown')).toBe('unknown')
  expect(duration(5000)).toBe('5秒')
  expect(duration(65000)).toBe('1分5秒')
  expect(duration(3_720_000)).toBe('1時間2分')
})

test('パネルに見出しと使用量が出る', async ($, on) => {
  mock.clock(on)
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 90_000, window: 200_000, percent: 45 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 23, resetsAt: '2026-10-08T06:00:00Z' }],
      cost: { usd: 1.23 },
    },
  }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'work-status',
      surface,
      component: 'Pane',
      requestId: 'work-status',
      props: { title: '作業状況', isFocused: false, bodyColumns: 40 },
    })
    for (const label of [/使用スキル/, /サブエージェント/, /モデル/, /経過時間/, /使用量/, /45%/, /\$1\.23/, /5時間/]) {
      expect(await ui.find({ type: 'Text', text: label })).toBeDefined()
    }
    await ui.unmount()
  }
})

test('トークン・料金・利用枠を日本語で表す', async () => {
  expect(tokenLabel(3400)).toBe('3,400')
  expect(tokenLabel(1_234_567)).toBe('123.5万')
  expect(usdLabel(1.234)).toBe('$1.23')
  expect(usdLabel(0.004)).toBe('$0.004')
  expect(limitLabel('five_hour')).toBe('5時間')
  expect(limitLabel('other')).toBe('other')
})
