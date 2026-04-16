# even-g2-page-lifecycle-reference.md

## Even G2 ページライフサイクルまとめ

**出典: [Even G2公式ドキュメント - Page Lifecycle](https://hub.evenrealities.com/docs/guides/page-lifecycle)**

### 主なメソッド
- **createStartUpPageContainer**: 初期ページ生成。起動時に1回のみ呼ばれる。
- **rebuildPageContainer**: ページ全体を再生成（全状態リセット、ハードウェアで一瞬ちらつく）。
- **textContainerUpgrade**: テキストのみインプレース更新（高速・ちらつきなし）。containerIDとcontainerNameが一致している必要。
- **updateImageRawData**: 画像コンテナの内容を更新（同時送信不可）。
- **shutDownPageContainer**: アプリ終了（0:即時終了, 1:確認ダイアログ）。
- **callEvenApp**: ジェネリック呼び出し（全ての型付きメソッドのラッパー）。

### 戻り値・ステータス
- createStartUpPageContainer: 0=成功, 1=パラメータ不正, 2=サイズ超過, 3=メモリ不足
- rebuildPageContainer, textContainerUpgrade, shutDownPageContainer: boolean
- updateImageRawData: 'success', 'imageException', 'imageSizeInvalid', 'imageToGray4Failed', 'sendFailed'

### ベストプラクティス
- 頻繁なテキスト更新はtextContainerUpgrade推奨（ちらつき防止）
- コンテナ構成変更時はrebuildPageContainerを使う
- textContainerUpgrade時はcontainerID/containerNameを厳密一致させる
- updateImageRawDataは逐次実行（同時送信禁止）

---

## Even G2関連公式ドキュメントリンク集

- [Display & UI System](https://hub.evenrealities.com/docs/guides/display)
- [Page Lifecycle](https://hub.evenrealities.com/docs/guides/page-lifecycle)
- [Input & Events](https://hub.evenrealities.com/docs/guides/input-events)
- [Device APIs](https://hub.evenrealities.com/docs/guides/device-apis)
- [UI/UX Design Guidelines](https://hub.evenrealities.com/docs/guides/design-guidelines)
- [Simulator](https://hub.evenrealities.com/docs/reference/simulator)
- [Packaging & Deployment](https://hub.evenrealities.com/docs/reference/packaging)
- [CLI](https://hub.evenrealities.com/docs/reference/cli)
- [コミュニティリソース](https://hub.evenrealities.com/docs/community/resources)

---

## ドキュメント再取得用スキルについて

このリファレンスやリンク集は公式ドキュメントの更新に追従するため、AIが自動で再フェッチ・要約できるスキル（fetch_even_g2_official_doc）を用意してください。
- スキル名例: fetch_even_g2_official_doc
- 引数: ドキュメントURL, 要約対象セクション名
- 返却: 最新の要約テキスト
- 用途: ドキュメント更新時の自動反映や、開発時の最新仕様参照

---
