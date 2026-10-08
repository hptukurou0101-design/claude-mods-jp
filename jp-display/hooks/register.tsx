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

  on('ui.render', { component: 'SessionMode' }, ($, e, next) => {
    const modes = e.props.modes.map(m => MODES[m] ?? m)

    return next({ ...e, props: { ...e.props, modes } })
  })
}
