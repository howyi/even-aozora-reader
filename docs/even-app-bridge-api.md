# EvenAppBridge API (日本語訳)

> 出典: `@evenrealities/even_hub_sdk` v0.0.7 の `index.d.ts` より抜粋し、日本語訳したものです。

## 概要

`EvenAppBridge` は Even App と WebView の双方向通信を行うブリッジです。シングルトンとして動作し、Web 側から Even App の機能呼び出しやイベント購読を行います。

## 取得と状態

### `static getInstance(): EvenAppBridge`

- シングルトンの取得。
- 未生成なら新規作成、生成済みなら同一インスタンスを返します。

### `_ready: boolean`

- ブリッジ初期化の完了状態。
- `true`: 初期化済み / `false`: 初期化中。

### `get ready(): boolean`

- `_ready` を返す getter。

## メッセージ処理

### `handleEvenAppMessage(message: string | EvenAppMessage): void`

- Even App から届いたメッセージを処理します。
- 例: `listen_even_app_data`（デバイス状態通知など）。

### `callEvenApp(method: EvenAppMethod | string, params?: any): Promise<any>`

- Even App のメソッドを呼び出す共通 API。
- 成功時は結果を返し、失敗時は例外を投げます。

## ユーザー/デバイス

### `getUserInfo(): Promise<UserInfo>`

- ユーザー情報を取得します。

### `getDeviceInfo(): Promise<DeviceInfo | null>`

- デバイス（眼鏡/リング）の情報を取得します。

## ローカルストレージ

### `setLocalStorage(key: string, value: string): Promise<boolean>`

- ローカルストレージへ保存します。

### `getLocalStorage(key: string): Promise<string>`

- ローカルストレージから取得します。

## コンテナ操作 (EvenHub)

### `createStartUpPageContainer(container: CreateStartUpPageContainer): Promise<StartUpPageCreateResult>`

- 起動ページのコンテナを作成します（カスタムアプリ起動時に必須）。
- ホスト側の戻り値は `0=success / 1=invalid / 2=oversize / 3=outOfMemory` です。

### `rebuildPageContainer(container: RebuildPageContainer): Promise<boolean>`

- ページコンテナを再構築します。

### `updateImageRawData(data: ImageRawDataUpdate): Promise<ImageRawDataUpdateResult>`

- 画像データを更新します。

### `textContainerUpgrade(container: TextContainerUpgrade): Promise<boolean>`

- テキストコンテナを更新します。

### `shutDownPageContainer(exitMode?: number): Promise<boolean>`

- ページコンテナを終了します。
- `exitMode`: `0` = 即時終了、`1` = 前面の操作レイヤーを出してユーザー判断に委ねる。

## オーディオ

### `audioControl(isOpen: boolean): Promise<boolean>`

- マイクのオン/オフを切り替えます。
- `true` でオン、`false` でオフ。

## イベント購読

### `onDeviceStatusChanged(callback: (status: DeviceStatus) => void): () => void`

- デバイス状態の変化を購読します。
- 返り値は解除関数です。

### `onEvenHubEvent(callback: (event: EvenHubEvent) => void): () => void`

- EvenHub イベントを購読します。
- 返り値は解除関数です。

## 参考: 使用例

```ts
const bridge = EvenAppBridge.getInstance();

const userInfo = await bridge.getUserInfo();
const deviceInfo = await bridge.getDeviceInfo();

const unsubscribe = bridge.onEvenHubEvent((event) => {
  if (event.textEvent) {
    // ...
  }
});

unsubscribe();
```

