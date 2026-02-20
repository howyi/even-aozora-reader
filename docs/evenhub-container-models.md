# EvenHub Container モデル概要（日本語訳・要点まとめ）

> 出典: `@evenrealities/even_hub_sdk` v0.0.7 の `dist/index.d.ts`（EvenHub container property models / CreateStartUpPageContainer 等）を元に、日本語訳しつつ要点を整理したものです。

用語:
- 本ドキュメントでは **ホスト（アプリ側 / Even App）** を、WebView を内包して Web 側へ JSON を送受信するネイティブ側（例: Flutter）として扱います。

## 1. 前提：この節のモデルがやっていること

SDK 側のコメントどおり、ここで定義されている Container 系モデルは以下に特化しています。

- **「フィールドモデル + JSON フィールド名のマッピング」だけ**を行う
- **protobuf のエンコード/デコードは一切しない**
- JS 側で一般的な camelCase を基本にしつつ、ホスト（Flutter）が透過してくる可能性のある protoName も許容する（例: `Container_ID` / `List_Object`）

そのため、多くのクラスに `static fromJson(...)` / `static toJson(...)` が用意されており、ホストとのやり取りは「JSON の形を揃える」発想で扱います。

## 2. コンテナを構成する要素（Property Models）

### 2.1 ListItemContainerProperty（リスト項目の見た目/構造）

PB: `List_ItemContainerProperty`

- `itemCount?: number`（PB: `Item_Count`）
- `itemWidth?: number`（PB: `Item_Width`）
- `isItemSelectBorderEn?: number`（PB: `Is_Item_Select_Border_En` / 0 or 1）
- `itemName?: string[]`（PB: `Item_Name`）

用途イメージ:
- List コンテナ（`ListContainerProperty`）の中で、「各 item の設定」を持たせるためのサブモデルです。

### 2.2 ListContainerProperty（リストコンテナ本体）

PB: `ListContainerProperty`

レイアウト/外観:
- `xPosition?: number`（PB: `X_Position`）
- `yPosition?: number`（PB: `Y_Position`）
- `width?: number`（PB: `Width`）
- `height?: number`（PB: `Height`）
- `borderWidth?: number`（PB: `Border_Width`）
- `borderColor?: number`（PB: `Border_Color`）
- `borderRdaius?: number`（PB: `Border_Rdaius` ※PB 側のスペルは Rdaius）
- `paddingLength?: number`（PB: `Padding_Length`）

識別子:
- `containerID?: number`（PB: `Container_ID`）
- `containerName?: string`（PB: `Container_Name`）

子要素:
- `itemContainer?: ListItemContainerProperty`（PB: `Item_Container`）

イベント:
- `isEventCapture?: number`（PB: `Is_event_capture` / 0 or 1）

補足:
- `isEventCapture` は、イベント（特にスワイプ等）がどのコンテナにルーティングされるかに影響する可能性があります。実践的な指針は [docs/even-g2-input-reference.md](even-g2-input-reference.md) も参照してください。

### 2.3 TextContainerProperty（テキストコンテナ）

PB: `TextContainerProperty`

基本フィールド（概ね List と同じ）:
- `xPosition?: number`, `yPosition?: number`, `width?: number`, `height?: number`
- `borderWidth?: number`, `borderColor?: number`, `borderRdaius?: number`
- `paddingLength?: number`
- `containerID?: number`, `containerName?: string`
- `isEventCapture?: number`

テキスト内容:
- `content?: string`（PB: `Content`）

### 2.4 ImageContainerProperty（画像コンテナ）

PB: `ImageContainerProperty`

- `xPosition?: number`, `yPosition?: number`, `width?: number`, `height?: number`
- `containerID?: number`, `containerName?: string`

注意:
- 画像そのものの bytes はこのモデルには含まれず、画像更新は後述の `ImageRawDataUpdate` を使います。

## 3. コンテナ構成（起動時/再構築）

### 3.1 CreateStartUpPageContainer（起動ページのコンテナ作成）

PB: `CreateStartUpPageContainer`

- `containerTotalNum?: number`（PB: `ContainerTotalNum`）
- `listObject?: ListContainerProperty[]`（PB: `List_Object`）
- `textObject?: TextContainerProperty[]`（PB: `Text_Object`）
- `imageObject?: ImageContainerProperty[]`（PB: `Image_Object`）

送信先:
- `EvenAppBridge.createStartUpPageContainer(...)`

備考:
- ホストの返り値は `StartUpPageCreateResult`（`0=success / 1=invalid / 2=oversize / 3=outOfMemory`）に正規化されます。

### 3.2 RebuildPageContainer（ページコンテナの再構築）

PB: `RebuildPageContainer`

フィールドは `CreateStartUpPageContainer` と同様です。

送信先:
- `EvenAppBridge.rebuildPageContainer(...)`

## 4. コンテナ更新系（画像/テキスト）

### 4.1 TextContainerUpgrade（テキストの差分更新）

PB: `TextContainerUpgrade`

- `containerID?: number`（PB: `Container_ID`）
- `containerName?: string`（PB: `Container_Name`）
- `contentOffset?: number`（PB: `ContentOffset`）
- `contentLength?: number`（PB: `ContentLength`）
- `content?: string`（PB: `Content`）

送信先:
- `EvenAppBridge.textContainerUpgrade(...)`

### 4.2 ImageRawDataUpdate / ImageRawDataUpdateFields（画像 bytes の更新）

#### ImageRawDataUpdate（実際に使う想定の画像更新モデル）

ホスト Dart 側: `EvenHubImageContainer`

- `containerID?: number`
- `containerName?: string`
- `imageData?: number[] | string | Uint8Array | ArrayBuffer`

コメント上の推奨:
- JS → ホストは **`number[]`（List<int>）が最も受けやすい**
- `Uint8Array/ArrayBuffer` を渡す場合は `toJson` 時に `number[]` に変換される想定
- `string` は base64 等としてホスト側で解釈する前提

送信先:
- `EvenAppBridge.updateImageRawData(...)`

#### ImageRawDataUpdateFields（フラグメント送信用っぽいフィールド群 / 現状は保留扱い）

SDK コメントでは「暂时用不到，保留（いまは使わないが残してある）」扱いです。

- `mapSessionId?: number`, `mapTotalSize?: number`
- `compressMode?: number`
- `mapFragmentIndex?: number`, `mapFragmentPacketSize?: number`
- `mapRawData?: number[] | string | Uint8Array | ArrayBuffer`

## 5. 画像まわりの具体的な扱い方（実装例）

このリポジトリの `app/src` には画像更新の実例コードは入っていないため、ここでは SDK の型定義コメントに沿った「最小の実装手順」と「データ形の作り方」を具体例としてまとめます。

### 5.1 手順（コンテナを作る → 画像を流し込む）

1) まず `ImageContainerProperty` を `CreateStartUpPageContainer.imageObject`（または `RebuildPageContainer.imageObject`）に含めて、画像を表示する“枠”を作ります。

2) 次に `updateImageRawData(new ImageRawDataUpdate(...))` で、同じ `containerID`（または `containerName`）宛に画像 bytes を送ります。

```ts
import {
  EvenAppBridge,
  CreateStartUpPageContainer,
  ImageContainerProperty,
  ImageRawDataUpdate,
} from "@evenrealities/even_hub_sdk";

const bridge = EvenAppBridge.getInstance();

// 1) 画像コンテナ（表示枠）を作る
await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 1,
    imageObject: [
      new ImageContainerProperty({
        xPosition: 0,
        yPosition: 0,
        width: 576,
        height: 288,
        containerID: 100,
        containerName: "hero-image",
      }),
    ],
  })
);

// 2) 画像 bytes を流し込む（例では number[]）
const bytes: number[] = [0, 1, 2, 3];

await bridge.updateImageRawData(
  new ImageRawDataUpdate({
    containerID: 100,
    imageData: bytes,
  })
);
```

### 5.2 `imageData` の推奨形（結論）

SDK のコメントでは、ホスト（Dart）側の受け取りやすさの観点から以下が推奨されています。

- 推奨: `number[]`（ホスト `List<int>` で最も受けやすい）
- 許容: `Uint8Array` / `ArrayBuffer`（`toJson` 時に `number[]` 化される想定）
- 許容: `string`（base64 等。ホスト側の解釈に依存する）

### 5.3 `Uint8Array` → `number[]` への具体的な変換

画像 bytes を `Uint8Array` で持っている場合、最も確実なのは自前で `number[]` に落としてから送る方法です。

```ts
const u8 = new Uint8Array([0, 255, 128]);

// number[] 化（0〜255 を保証したい場合は & 0xff しても良い）
const bytes = Array.from(u8, (v) => v & 0xff);

await bridge.updateImageRawData(
  new ImageRawDataUpdate({
    containerID: 100,
    imageData: bytes,
  })
);
```

### 5.4 `ArrayBuffer` の場合

`fetch(...).arrayBuffer()` 等で `ArrayBuffer` が手に入る場合は、そのまま `imageData` に渡せます。

```ts
const buf = await fetch("/path/to/raw.bin").then((r) => r.arrayBuffer());

await bridge.updateImageRawData(
  new ImageRawDataUpdate({
    containerID: 100,
    imageData: buf,
  })
);
```

ただし、ホストが本当に期待する bytes フォーマット（並び/ピクセル形式/圧縮有無など）はホスト実装に依存します。まずは「ホストが受け取って描画できる bytes」を用意できているかを確認してください。

### 5.5 base64 文字列（`string`）の場合

SDK は `string` を許容していますが、「どの base64 形式をホストが期待するか」はこの型定義からは確定できません。

- `data:image/png;base64,...` のような data URL をそのまま渡せるか
- prefix を除いた純粋な base64 のみを期待するか

はホスト側の実装次第なので、受け側の仕様に合わせてください。

### 5.6 送信 JSON の形を確認する（デバッグ）

`ImageRawDataUpdate` には `toJson()` があるので、ブリッジに投げる直前に「ホストへ送る JSON」を確認できます。

```ts
const msg = new ImageRawDataUpdate({ containerID: 100, imageData: new Uint8Array([1, 2, 3]) });
console.log("updateImageRawData payload:", msg.toJson());
await bridge.updateImageRawData(msg);
```

補足: SDK には bytes を JSON-friendly にするための `bytesToJson(...)` ユーティリティも公開されています（`Uint8Array/ArrayBuffer` を `number[]` にする、など）。

## 6. JSON 互換の考え方（camelCase / protoName）

各モデルの `fromJson` / `toJson` は、ホストから来る key 名の揺れを吸収する意図があります。

- camelCase: `containerID`
- protoName 例: `Container_ID`
- protoName（配列）例: `Text_Object`

この互換性を支えるために、SDK 内部には JSON ユーティリティも定義されています（`pick` / `pickLoose` / `normalizeLooseKey` / `readNumber` / `readString` 等）。

## 7. 最小の使用例（起動→再構築→テキスト更新→画像更新）

```ts
import {
  EvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  ImageRawDataUpdate,
} from "@evenrealities/even_hub_sdk";

const bridge = EvenAppBridge.getInstance();

const text = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 96,
  containerID: 1,
  containerName: "title",
  content: "hello",
  isEventCapture: 1,
});

// 起動時に 1 回
await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [text],
  })
);

// 以後、画面を作り直すなら
await bridge.rebuildPageContainer(
  new RebuildPageContainer({
    containerTotalNum: 1,
    textObject: [text],
  })
);

// テキスト差分更新
await bridge.textContainerUpgrade(
  new TextContainerUpgrade({
    containerID: 1,
    contentOffset: 0,
    contentLength: 5,
    content: "HELLO",
  })
);

// 画像更新（例: number[] を推奨）
await bridge.updateImageRawData(
  new ImageRawDataUpdate({
    containerID: 2,
    imageData: [0, 1, 2, 3],
  })
);
```

