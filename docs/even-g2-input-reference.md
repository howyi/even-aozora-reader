# Even G2 グラス入力リファレンス

> 注記: このドキュメントは開発者Discordで共有された案内を要約したものです。

EvenHub SDK を用いたテスト結果に基づく、Even G2 グラスのタッチパッド入力仕様のまとめです。

## イベントルーティング概要

| ジェスチャー | イベントタイプ | eventType 値 | 到達形式 |
| --- | --- | --- | --- |
| 前方スワイプ (Swipe forward) | `SCROLL_BOTTOM_EVENT` | `2` | `textEvent` |
| 後方スワイプ (Swipe backward) | `SCROLL_TOP_EVENT` | `1` | `textEvent` |
| シングルタップ | `CLICK_EVENT` | `0` | `sysEvent` |
| ダブルタップ | `DOUBLE_CLICK_EVENT` | `3` | `sysEvent` |

**重要なポイント:** スワイプは `isEventCapture = 1` を設定したコンテナ宛の `textEvent` として届きますが、タップは任意コンテナに紐付かないグローバルな `sysEvent` として届きます。

## Protobuf のゼロ値 (Zero-Value) による罠

`CLICK_EVENT = 0` は Protobuf のデフォルト値です。ホストはデフォルト値をシリアライズ時に省略するため、シングルタップは以下のように配信されます。

```json
{ "type": "sysEvent", "jsonData": {} }
```

SDK 側では `eventType: 0` ではなく `eventType: undefined` として扱われます。`undefined` をクリックとして処理する必要があります。

```ts
if (eventType === OsEventTypeList.CLICK_EVENT || eventType === undefined) {
  // シングルタップを処理
}
```

ダブルタップ (`eventType: 3`) はデフォルト値ではないため省略されず、通常どおり届きます。

```json
{ "type": "sysEvent", "jsonData": { "eventType": 3 } }
```

## コンテナセットアップの推奨

`TextContainerProperty` は `ListContainer` よりもスワイプイベントをネイティブに処理しやすいため、表示にはテキストコンテナの使用が推奨されます。スワイプイベントを受け取るには、**ちょうど 1 つのコンテナ** に `isEventCapture: 1` を設定してください。タップは `sysEvent` で届くため `isEventCapture` 設定は不要です。

```ts
const containers: TextContainerProperty[] = [];

for (let i = 0; i < 3; i++) {
  containers.push(new TextContainerProperty({
    xPosition: 0,
    yPosition: i * 96,       // 288 / 3 = 96px
    width: 576,
    height: 96,
    borderWidth: isSelected(i) ? 3 : 0,
    borderColor: 5,
    paddingLength: 2,
    containerID: i + 1,
    containerName: `item-${i + 1}`,
    content: getContent(i),
    isEventCapture: isSelected(i) ? 1 : 0,
  }));
}

await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 3,
    textObject: containers,
  })
);

await bridge.rebuildPageContainer(
  new RebuildPageContainer({
    containerTotalNum: 3,
    textObject: containers,
  })
);
```

## イベントハンドリング指針

```ts
bridge.onEvenHubEvent((event: EvenHubEvent) => {
  // スワイプは textEvent
  if (event.textEvent) {
    const eventType = event.textEvent.eventType;

    if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
      // 後方スワイプ: 前へ
    } else if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      // 前方スワイプ: 次へ
    }
  }

  // タップは sysEvent
  if (event.sysEvent) {
    const eventType = event.sysEvent.eventType;

    if (eventType === OsEventTypeList.CLICK_EVENT || eventType === undefined) {
      // シングルタップ: 決定
    } else if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      // ダブルタップ: 戻る
    }
  }
});
```

## ホストメッセージの生フォーマット

```json
// スワイプ (textEvent, eventType あり)
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

```json
// シングルタップ (sysEvent, eventType 0 は省略)
{
  "type": "listen_even_app_data",
  "method": "evenHubEvent",
  "data": {
    "type": "sysEvent",
    "jsonData": {}
  }
}
```

```json
// ダブルタップ (sysEvent, eventType 3 あり)
{
  "type": "listen_even_app_data",
  "method": "evenHubEvent",
  "data": {
    "type": "sysEvent",
    "jsonData": {
      "eventType": 3
    }
  }
}
```

## ディスプレイ制約 (G1)

- キャンバス: 576 x 288 ピクセル
- 1ページあたりの最大コンテナ数: 4
- 実用上は 96px × 3 行のテキストレイアウトが適切
- タイトルは ~50 文字で 1 行に収まる
- `containerName` は最大 16 文字
- `content` は Startup 時 1000 文字 / `textContainerUpgrade` 時 2000 文字まで

## `OsEventTypeList` 列挙体

```ts
enum OsEventTypeList {
  CLICK_EVENT = 0,          // シングルタップ (⚠️ undefined として届く)
  SCROLL_TOP_EVENT = 1,     // 後方スワイプ
  SCROLL_BOTTOM_EVENT = 2,  // 前方スワイプ
  DOUBLE_CLICK_EVENT = 3,   // ダブルタップ
  FOREGROUND_ENTER_EVENT = 4,
  FOREGROUND_EXIT_EVENT = 5,
  ABNORMAL_EXIT_EVENT = 6,
}
```

