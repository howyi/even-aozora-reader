# EvenHub Event モデル概要（日本語訳・要点まとめ）

> 出典: `@evenrealities/even_hub_sdk` v0.0.7 の `dist/index.d.ts`（EvenHub Event models 節）を元に、日本語訳しつつ開発者向けに要点を整理したものです。

## 1. これは何？（全体像）

用語:
- 本ドキュメントでは **ホスト（アプリ側 / Even App）** を、WebView を内包して Web 側へイベントを push するネイティブ側（例: Flutter）として扱います。

Even App（ホスト / Flutter）から WebView（Web）へ push される EvenHub のイベントを、Web 側で扱いやすい形にまとめたモデルです。

- ホストからの入力形が揺れることを前提に、**ゆるい（寛容な）パース**を行う設計です
- Web 側は `EvenAppBridge.onEvenHubEvent(...)` を購読し、届いた `EvenHubEvent` のどのプロパティが入っているかで分岐します

関連: EvenAppBridge の全体は [docs/even-app-bridge-api.md](even-app-bridge-api.md) を参照。

## 2. イベント種別（EvenHubEventType）

ホストが送るイベントの type を表します。

- `listEvent`
- `textEvent`
- `sysEvent`
- `audioEvent`
- `notSet`

## 3. Web 側の統一イベント型（EvenHubEvent）

Web 側で受け取るイベントは、次の **統一構造**になります。

- `listEvent?: List_ItemEvent`
- `textEvent?: Text_ItemEvent`
- `sysEvent?: Sys_ItemEvent`
- `audioEvent?: AudioEventPayload`
- `jsonData?: Record<string, any>`（元の JSON を保持する用途。デバッグ/回放向け）

使い方の基本は「どれが入っているか」を見るだけです。

```ts
bridge.onEvenHubEvent((event) => {
  if (event.listEvent) {
    // listEvent を処理
  } else if (event.textEvent) {
    // textEvent を処理
  } else if (event.sysEvent) {
    // sysEvent を処理
  } else if (event.audioEvent) {
    // audioEvent を処理
    console.log(event.audioEvent.audioPcm.length);
  }
});
```

## 4. 各イベントの payload（強い型）

`EvenHubEventPayload` は以下の union として定義されています。

- `listEvent` → `List_ItemEvent`
- `textEvent` → `Text_ItemEvent`
- `sysEvent` → `Sys_ItemEvent`
- `audioEvent` → `AudioEventPayload`
- 互換性のためのフォールバック → `Record<string, any>`

注意点:
- 型定義コメントには `imgEvent -> ImageReflashEvent` の記載がありますが、v0.0.7 の該当 `index.d.ts` では `ImageReflashEvent` 型は見当たらず、`EvenHubEvent` にも `imgEvent` プロパティは定義されていません。
- そのため、未知のイベントが来た場合は **`jsonData`（生 JSON）を参照**する運用が安全です。

## 5. 音声イベント（AudioEventPayload）

音声イベントの payload は以下です。

- `audioPcm: Uint8Array`

型定義コメント上の補足（重要）:
- ホストは `onAudioData` 経由で **PCM バイト列**を push します
- ホスト側（Dart）の `Uint8List` を JSON 化すると、実際の到達形は環境によって
  - `number[]`（0〜255 の配列）
  - base64 文字列
  のどちらかになりがちです

SDK の公開型としては `Uint8Array` になっているため、Web 側は基本 `Uint8Array` として扱う想定ですが、実機/シミュレータで到達形が異なる場合は `event.jsonData` を見て実データ形を確認してください。

## 6. ホスト→Web の入力フォーマット（寛容パース）

`evenHubEventFromJson(input)` はホストからの入力が次の形でも動くように設計されています。

- `{ type: 'listEvent', jsonData: { ... } }`
- `{ type: 'list_event', data: { ... } }`
- `[ 'list_event', { ... } ]`

パース方針（型定義コメントの要約）:

1. `type` を正規化
2. データ部を `jsonData: Record<string, any>` に寄せる
3. `type` に応じて `listEvent/textEvent/sysEvent` 等のイベントモデルへ変換

## 7. EvenAppMessage（外側の封筒）との関係

EvenHub イベントは、Even App → WebView の通知（listen）メッセージとして届き、メッセージの `method` が `evenHubEvent` になります。

概形（例）:

```json
{
  "type": "listen_even_app_data",
  "method": "evenHubEvent",
  "data": {
    "type": "textEvent",
    "jsonData": {
      "containerID": 1,
      "containerName": "item-1",
      "eventType": 2
    }
  }
}
```

実際のハンドリングは `EvenAppBridge.onEvenHubEvent(...)` を使うのが推奨です。

## 8. 運用上の注意（落とし穴）

- ホスト側が unknown な `type` を送ってきても、Web 側の型は必ずしも増えていない可能性があります（例: コメント上の `imgEvent`）。
  - その場合は `event.jsonData`（生 JSON）をログし、必要なら自前で分岐・変換するのが安全です。
- 型定義の `EvenHubEventType.notSet` は「未設定/不明」を表す用途ですが、Web 側では基本的に `EvenHubEvent` のどのプロパティが入っているかを基準に処理するのが簡単です。

