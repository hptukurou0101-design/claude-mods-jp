# Claude Code 日本語 MOD 集

Claude Code（ターミナル版）に入れて使う MOD を2つまとめています。

| MOD | できること |
| --- | --- |
| `work-status`（作業状況） | 画面の横に「使用スキル／サブエージェント（実行中・完了）／モデル／経過時間／使用量（コンテキスト・トークン・料金の目安・利用枠）」のパネルを表示します。閉じたときは `/work-status` で開き直せます。 |
| `jp-display`（日本語表示） | 作業中の表示（`Sauteing…` → `考え中…`）、作業時間の行（`Baked for 3s` → `✻ 3秒で完了`）、操作ヒント（`esc to interrupt` → `esc で中断`）、ツールのまとめ行（`Read 3 files` → `3件のファイルを読み込み`）、中断したツールの行（`Interrupted` → `中断しました`）、起動時のお知らせの一部などを日本語にします。 |

## 入れ方

ターミナルで Claude Code を起動し、入力欄に次の行を1つずつ打ちます（使いたい方だけでも大丈夫です）。

```
/plugin install work-status --marketplace hptukurou0101-design/claude-mods-jp
/plugin install jp-display --marketplace hptukurou0101-design/claude-mods-jp
```

1. 最初に `Add marketplace?` と聞かれたら `y` を押します（2つ目からは聞かれません）。
2. 入れる範囲を聞かれたら、一番上（ユーザー全体）のまま Enter を押します。
3. `Installed ... Plugin is now active.` と出たら完了です。その場から使えます。

- 作業状況パネルは画面の横幅が広いとき（144文字以上）に自動で開きます。狭いときは `/work-status` で開きます。
- デスクトップアプリの Code タブでは `/plugin install` は使えません。ターミナルで一度入れれば、デスクトップアプリでも動きます。

## 外し方・止め方

`/plugin` を開いて、一覧から外したい MOD を選びます。

## 注意

- MOD は Claude Code と同じ権限で動きます。中身はこのリポジトリのコードがすべてです。
- 翻訳は決まった言い回しだけを置き換えます。辞書にない英語はそのまま表示されます。
- 許可を聞く画面・`/plugin` などのメニュー・エラー文は Claude Code 本体が描くため、MOD では日本語にできません。

## 更新のしかた

`/plugin` を開き、`claude-mods-jp` のマーケットプレイスを更新してから、入っている MOD を更新します。
