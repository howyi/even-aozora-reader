# Even G2 開発者マニュアル (Unofficial Guide)

Even Realities G2 グラス向けアプリ開発のためのガイドです。
このドキュメントは開発者Discordの案内を要約したものです。

## 概要

**Even G2のアプリは、本質的には「ウェブサイト」です。**
Evenアプリまたはブラウザを介して動作するため、開発プロセスは標準的なウェブ開発（HTML/CSS/JavaScript/TypeScript）と非常に似ています。主な違いは、Even Hub特有の機能が追加されている点だけです。

プロジェクトはTypeScript（JavaScriptのスーパーセット）で動作し、npmパッケージを直接インストールして管理します。通常、開発環境が変わっても `pnpm install` を実行すれば依存関係が復元されます。

---

## 環境構築

開発にはNode.js/pnpm環境が必要です。以下のツールをインストールしてください。

### 1. Even Hub CLI のインストール
システム全体で使用できるよう、グローバルにインストールします。

```bash
# macOS / Linux
sudo pnpm add -g @evenrealities/evenhub-cli

# Windows (sudoは不要)
pnpm add -g @evenrealities/evenhub-cli
```
これにより、VSCodeやCursorなどのIDEを含む、システムのどこからでもツールを使用できるようになります。

### 2. プロジェクトへの SDK のインストール
プロジェクトディレクトリ内で実行します（`-g` は不要です）。

```bash
pnpm add @evenrealities/even_hub_sdk
```
※ `even-better-sdk`（コミュニティ製の実装しやすいSDK）も存在します。詳細は「リソース」セクションを参照してください。

### 3. シミュレーターのインストール
実機がなくてもデスクトップで動作確認ができるシミュレーターです。

```bash
sudo pnpm add -g @evenrealities/evenhub-simulator
```

---

## プロジェクトの作成と構成

アプリはウェブサイトそのものです。以下の構成が基本となります。

1.  **`index.html` の作成**
    *   プロジェクトのルートディレクトリ（サブフォルダではない場所）に作成してください。必須です。
    *   Even Hubはアプリ実行時にまずこのファイルを探します。
    *   通常のWebサイト同様にボタンやテキストを配置します。
2.  **ロジックの実装 (`Main.ts`)**
    *   実際のコードを記述するファイルを作成します（例: `Main.ts`）。
    *   HTMLファイル内でスクリプトを読み込みます。
    ```html
    <script type="module" src="/path/to/Main.ts"></script>
    ```

### 開発サーバーの立ち上げ (Vite)

Even Hubアプリやシミュレーターが接続するためのWebサーバーが必要です。**Vite**の使用が推奨されています。

1.  **Viteのインストール**
    ```bash
    sudo pnpm add -g vite@latest
    ```
    YouTubeなどでViteの解説動画を見ると理解が早まります。

2.  **サーバーの起動**
    IPアドレスとポートを指定して起動します。
    ```bash
    vite -i [あなたのIPアドレス] -p [ポート番号]
    ```

---

## 開発と実行

### SDKの使用（基本）
グラスとの通信を行うブリッジ機能をインポートします。

```typescript
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
```

### シミュレーターでの実行
Viteサーバーを起動した状態で、**別のターミナルウィンドウ**を開き、以下のコマンドを実行します。

```bash
evenhub-simulator [ViteサーバーのURL]
```
*   これにより、Webサイトがシミュレーター内で開かれます。
*   Viteを実行しているウィンドウは閉じないでください。
*   シミュレーターは、モバイルアプリ内での表示を確認するためのテンポラリブラウザウィンドウも表示します（モバイルフレンドリーなUI開発に役立ちます）。

---

## デザインガイドライン

Even RealitiesはFigmaで公式のデザインガイドラインを公開しています。ページのマージンやカラーコードなどの詳細な仕様が含まれています。

*   **UI/UX Guideline (Figma):** [リンク](https://www.figma.com/design/X82y5uJvqMH95jgOfmV34j/Even-Realities---Software-Design-Guidelines--Public-?node-id=2922-80782&t=ZIxZJDitnBnZJOwb-1)

**Tips:** AIアシスタント（ChatGPTやClaudeなど）にこのFigmaリンクを読み込ませて、ドキュメントに沿ったデザインコードの生成を支援させることも可能です。

---

## 最新機能とアップデート (SDK v0.0.7 & Beta)

### 1. マイク入力 (Microphone API)
SDK v0.0.7より、G2のマイクから生の音声入力を取得できるようになりました。これにより、音声制御プラグインや音声分析などのUXが可能になります。詳細はnpmのドキュメントを参照してください。

### 2. OpenClaw 統合 (BYOA: Bring Your Own Agent)
実験的な機能として、Even AIのコマンドルートを、ローカルのOpenClawインスタンスに向けることができます。これにより、AIがローカルPC上のファイル操作やコード実行を行えるようになります。

**要件:** Beta App (v2.1.0 Build 602以降) が必要です。

**セットアップ手順:**

1.  **PC側の準備 (OpenClaw):**
    設定ファイル（通常 `~/.openclaw/openclaw.json`）を確認・編集します。
    ```json
    "gateway": {
      "bind": "lan",
      "port": 18789
    },
    // ...
    "auth": {
      "mode": "token",
      "token": "YOUR_SECURE_TOKEN" // 強力でユニークなキーを設定してください
    },
    // ...
    ```
    *   **Deep Access Warning:** OpenClawインスタンスはPCへの深いアクセス権を持ちます。高度な保護なしにパブリックインターネットに公開しないでください。ローカルネットワーク（LAN）またはTailscaleの使用を強く推奨します。

2.  **スマホアプリ側の設定:**
    *   `Settings` > `Even AI` > `Agent Configuration` へ移動。
    *   **Endpoint:** `http://[PCのIPアドレス]:18789/v1/chat/completions` (Tailscaleの場合はそのIP)
    *   **API Key:** 上記で設定したトークンを入力。
    *   保存して有効化します。

---

## リソースリンク集

*   **CLI Tool:** [npm link](https://www.npmjs.com/package/@evenrealities/evenhub-cli)
*   **SDK Core:** [npm link](https://www.npmjs.com/package/@evenrealities/even_hub_sdk)
*   **Even Better SDK (Community):** [npm link](https://www.npmjs.com/package/@jappyjan/even-better-sdk) - コミュニティメンバー @JappyJan 作成の抽象化された使いやすいSDK
*   **Simulator:** [npm link](https://www.npmjs.com/package/@evenrealities/evenhub-simulator)
*   **Demo App (GitHub):** [EH-InNovel](https://github.com/even-realities/EH-InNovel) - 参考用デモアプリ（Super Rough）
