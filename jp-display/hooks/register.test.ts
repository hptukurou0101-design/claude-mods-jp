import { expect, test } from 'claude-code/testing'

import { duration, groupSummary, toolArg, translateHint, translateMessage, translateNotice } from './register'

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

test('ツールまとめ行を日本語にする', async () => {
  const done = (tool: string, isErrored = false) => ({ tool, isRunning: false, isErrored })
  expect(groupSummary([done('Read'), done('Read'), done('Read'), done('Bash'), done('Bash')], false)).toBe(
    '3件のファイルを読み込み、2回コマンドを実行',
  )
  expect(groupSummary([done('Grep'), done('Glob', true)], false)).toBe('2回検索（エラー1件）')
  expect(groupSummary([{ tool: 'Read', isRunning: true, isErrored: false }], true)).toBe('1件のファイルを読み込み 中…')
  expect(groupSummary([done('WebFetch')], false)).toBe('WebFetch を1回')
})

test('ツールの行の見出しと起動時のお知らせ', async () => {
  expect(toolArg({ command: 'ls -la\necho hi' })).toBe('ls -la')
  expect(toolArg({ file_path: '/a/b.ts' })).toBe('/a/b.ts')
  expect(toolArg(null)).toBe('')
  expect(translateNotice('Tip: press esc to interrupt')).toBe('ヒント：press esc で中断')
  expect(translateNotice('Something else')).toBe('Something else')
})

test('まとめ行が日本語で描かれる', async $ => {
  const ui = await $.ui.mount({
    plugin: 'jp-display',
    surface: 'terminal',
    component: 'ToolGroup',
    props: {
      calls: [
        { tool: 'Read', input: {}, isRunning: false, isErrored: false, isInterrupted: false },
        { tool: 'Grep', input: {}, isRunning: false, isErrored: false, isInterrupted: false },
      ],
      isActive: false,
      isExpanded: false,
    },
  })
  expect(await ui.find({ type: 'Text', text: /1件のファイルを読み込み、1回検索/ })).toBeDefined()
  await ui.unmount()
})

test('中断したツールの行が日本語になる', async $ => {
  const ui = await $.ui.mount({
    plugin: 'jp-display',
    surface: 'terminal',
    component: 'ToolUse',
    props: {
      tool_use_id: 't1',
      tool: 'Bash',
      input: { command: 'npm test' },
      isRunning: false,
      isErrored: true,
      isInterrupted: true,
    },
  })
  expect(await ui.find({ type: 'Text', text: /中断しました/ })).toBeDefined()
  await ui.unmount()
})
