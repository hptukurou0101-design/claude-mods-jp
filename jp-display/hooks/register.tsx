import type { Register } from 'claude-code'

// スピナー：英語のランダムな単語（Sauteing など）を、今していることの日本語に
export const SPINNER_WORDS: Record<string, string> = {
  requesting: '送信中',
  thinking: '考え中',
  responding: '回答中',
  'tool-input': '準備中',
  'tool-use': '作業中',
}

// 状態表示の英語メッセージ
const MESSAGES: Array<[RegExp, string]> = [
  [/^Processing/i, '処理中'],
  [/^Thinking/i, '考え中'],
  [/^Compacting conversation/i, '会話を要約中'],
  [/^Retrying/i, '再試行中'],
  [/^Waiting/i, '待機中'],
  [/^Interrupted/i, '中断しました'],
  [/^Task complete!?/i, 'タスクが完了しました！'],
]

// 操作ヒント：「キー to 動作」→「キー で 動作」
const ACTIONS: Array<[string, string]> = [
  ['run in background', 'バックグラウンド実行'],
  ['interrupt', '中断'],
  ['cancel', 'キャンセル'],
  ['cycle', '切替'],
  ['exit', '終了'],
  ['expand', '展開'],
  ['collapse', '折りたたみ'],
  ['edit', '編集'],
  ['undo', '元に戻す'],
  ['select', '選択'],
  ['navigate', '移動'],
  ['confirm', '確定'],
  ['retry', '再試行'],
  ['send', '送信'],
  ['queue', '予約'],
  ['approve', '承認'],
  ['hide', '非表示'],
  ['scroll', 'スクロール'],
  ['search', '検索'],
  ['submit', '送信'],
]

const PHRASES: Array<[RegExp, string]> = [
  [/\? for shortcuts/g, '? でショートカット一覧'],
  [/Press Ctrl-C again to exit/gi, 'もう一度 Ctrl-C で終了'],
  [/Press Ctrl-D again to exit/gi, 'もう一度 Ctrl-D で終了'],
  [/Press Esc again to clear/gi, 'もう一度 Esc で入力を消去'],
  [/accept edits on/gi, '編集の自動承認 ON'],
  [/plan mode on/gi, 'プランモード ON'],
  [/auto mode on/gi, 'オートモード ON'],
  [/bypass permissions on/gi, '権限確認なし ON'],
  [/\(shift\+tab to cycle\)/gi, '（shift+tab で切替）'],
]

const MODES: Record<string, string> = {
  focus: '集中',
  'memory paused': 'メモリ停止中',
  'plan mode': 'プランモード',
  'auto mode': 'オートモード',
  'fast mode': '高速モード',
}

export const translateHint = (text: string): string => {
  let out = text
  for (const [re, ja] of PHRASES) out = out.replace(re, ja)
  for (const [en, ja] of ACTIONS) {
    out = out.replace(new RegExp(`\\bto ${en}\\b`, 'gi'), `で${ja}`)
  }
  return out
}

export const translateMessage = (text: string): string => {
  for (const [re, ja] of MESSAGES) {
    if (re.test(text)) return text.replace(re, ja)
  }
  return text
}

// ツールまとめ行：「Read 3 files, ran 2 shell commands」→「3件のファイルを読み込み、2回コマンドを実行」
type GroupCall = { tool: string; isRunning: boolean; isErrored: boolean }

const GROUP_LABELS: Array<[string[], (n: number) => string]> = [
  [['Read'], n => `${n}件のファイルを読み込み`],
  [['Grep', 'Glob'], n => `${n}回検索`],
  [['LS'], n => `${n}件のフォルダを表示`],
  [['Bash'], n => `${n}回コマンドを実行`],
]

export const groupSummary = (calls: readonly GroupCall[], isActive: boolean): string => {
  const counts = new Map<string, number>()
  for (const c of calls) {
    const entry = GROUP_LABELS.find(([tools]) => tools.includes(c.tool))
    const key = entry ? entry[0][0]! : c.tool
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const parts = [...counts].map(([key, n]) => {
    const entry = GROUP_LABELS.find(([tools]) => tools[0] === key)
    return entry ? entry[1](n) : `${key} を${n}回`
  })
  let line = parts.join('、')
  const errors = calls.filter(c => c.isErrored).length
  if (errors > 0) line += `（エラー${errors}件）`
  if (isActive && calls.some(c => c.isRunning)) line += ' 中…'
  return line
}

// ツールの行の見出し：Bash(ls -la) の括弧の中
export const toolArg = (input: unknown): string => {
  if (!input || typeof input !== 'object') return ''
  const o = input as Record<string, unknown>
  const v = o.command ?? o.file_path ?? o.pattern ?? o.url ?? o.description ?? o.prompt
  if (typeof v !== 'string') return ''
  const first = v.split('\n')[0] ?? ''
  return first.length > 60 ? `${first.slice(0, 60)}…` : first
}

// 起動時のお知らせ行
const NOTICES: Array<[RegExp, string]> = [
  [/^Run (\/\S+) to /i, '$1 で'],
  [/^Tip: /i, 'ヒント：'],
  [/^Note: /i, 'メモ：'],
  [/^Update available/i, '更新があります'],
]

export const translateNotice = (text: string): string => {
  let out = text
  for (const [re, ja] of NOTICES) out = out.replace(re, ja)
  return translateHint(out)
}

// 65000 → 1分5秒
export const duration = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}分${s % 60}秒` : `${s}秒`
}

export const register: Register = on => {
  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    // デスクトップ版の単語は「notes.md を作成中」など中身があるのでそのまま
    if (e.surface !== 'terminal') return next(e)
    const word = SPINNER_WORDS[e.props.mode] ?? e.props.word
    const message = e.props.message === null ? null : translateMessage(e.props.message)

    return next({ ...e, props: { ...e.props, word, message } })
  })

  // 「Baked for 3s」→「✻ 3秒で完了」
  on('ui.render', { component: 'TurnDuration' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text dimColor>✻ {duration(e.props.durationMs)}で完了</Text>
  })

  on('ui.render', { component: 'PromptHint' }, ($, e, next) => {
    const hint = translateHint(e.props.hint)
    if (hint === e.props.hint) return next(e)

    return next({ ...e, props: { ...e.props, hint } })
  })

  on('ui.render', { component: 'ToolProgress' }, ($, e, next) => {
    return next({ ...e, props: { ...e.props, hint: translateHint(e.props.hint) } })
  })

  // 展開していないときだけ、まとめ行を自前で描く（ctrl+o の展開表示は本体のまま）
  on('ui.render', { component: 'ToolGroup' }, ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.isExpanded || e.props.calls.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Text dimColor={e.props.isActive}>⏺ </Text>
        <Text>{groupSummary(e.props.calls, e.props.isActive)}</Text>
        <Text dimColor> （ctrl+o で展開）</Text>
      </Box>
    )
  })

  // 中断したツールの行：「Interrupted」→「中断しました」
  on('ui.render', { component: 'ToolUse' }, ($, e, next) => {
    if (e.surface !== 'terminal' || !e.props.isInterrupted) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const arg = toolArg(e.props.input)

    return (
      <Box flexDirection="column">
        <Text>
          <Text dimColor>⏺ </Text>
          <Text bold>{e.props.tool}</Text>
          {arg ? `(${arg})` : ''}
        </Text>
        <Text color="red">  ⎿  中断しました</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'InfoNotice' }, ($, e, next) => {
    const text = translateNotice(e.props.text)
    if (text === e.props.text) return next(e)

    return next({ ...e, props: { ...e.props, text } })
  })

  on('ui.render', { component: 'SessionMode' }, ($, e, next) => {
    const modes = e.props.modes.map(m => MODES[m] ?? m)

    return next({ ...e, props: { ...e.props, modes } })
  })
}
