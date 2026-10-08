import { expect, mock, test } from 'claude-code/testing'

import { duration, modelLabel } from './register'

test('モデル名と時間を日本語で表す', async () => {
  expect(modelLabel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelLabel('claude-haiku-5-5')).toBe('Haiku 5.5')
  expect(modelLabel('unknown')).toBe('unknown')
  expect(duration(5000)).toBe('5秒')
  expect(duration(65000)).toBe('1分5秒')
  expect(duration(3_720_000)).toBe('1時間2分')
})

test('パネルに4つの見出しが出る', async ($, on) => {
  mock.clock(on)
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'work-status',
      surface,
      component: 'Pane',
      requestId: 'work-status',
      props: { title: '作業状況', isFocused: false, bodyColumns: 40 },
    })
    for (const label of [/使用スキル/, /サブエージェント/, /モデル/, /経過時間/]) {
      expect(await ui.find({ type: 'Text', text: label })).toBeDefined()
    }
    await ui.unmount()
  }
})
