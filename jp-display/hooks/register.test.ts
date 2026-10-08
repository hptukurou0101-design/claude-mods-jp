import { expect, test } from 'claude-code/testing'

import { duration, translateHint, translateMessage } from './register'

test('操作ヒントを日本語にする', async () => {
  expect(translateHint('? for shortcuts')).toBe('? でショートカット一覧')
  expect(translateHint('esc to interrupt')).toBe('esc で中断')
  expect(translateHint('(ctrl+b to run in background)')).toBe('(ctrl+b でバックグラウンド実行)')
  expect(translateHint('accept edits on (shift+tab to cycle)')).toBe('編集の自動承認 ON （shift+tab で切替）')
  expect(translateHint('unknown text')).toBe('unknown text')
})

test('状態メッセージを日本語にする', async () => {
  expect(translateMessage('Processing…')).toBe('処理中…')
  expect(translateMessage('Task complete!')).toBe('タスクが完了しました！')
  expect(duration(64000)).toBe('1分4秒')
})

test('作業時間の行が日本語になる', async $ => {
  const ui = await $.ui.mount({
    plugin: 'jp-display',
    surface: 'terminal',
    component: 'TurnDuration',
    props: { word: 'Baked', durationMs: 3000 },
  })
  expect(await ui.find({ type: 'Text', text: /3秒で完了/ })).toBeDefined()
  await ui.unmount()
})
