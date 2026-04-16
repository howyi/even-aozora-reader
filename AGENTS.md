# AGENTS.md

## Project Overview

This project is an **Aozora Bunko reader for Even G2**.

The expected product behavior is:

- Users select a book on the WebView side.
- The selected work is displayed on Even G2.
- Reading is performed on the glasses with scroll gestures.
- Reading progress is saved **per work** in LocalStorage.
- Works with saved progress are shown at the top of WebView as **"Currently Reading"**.
- A search bar is placed at the top of the WebView for finding works.
- Tapping a work opens it on Even G2, and if progress exists, resumes from that point.

## Documentation Guide

Read docs in this order when implementing or modifying behavior:

1. `docs/even-g2-developer-manual.md`
   - Overall Even G2 app development flow and constraints.
2. `docs/even-app-bridge-api.md`
   - Bridge API surface for host/WebView communication.
3. `docs/evenhub-event-models.md`
   - Event payloads and routing model.
4. `docs/evenhub-container-models.md`
   - Container and rendering models.
5. `docs/even-g2-input-reference.md`
   - Practical input handling rules for swipe/tap behavior.

## Docs Naming Convention

Use the following rule for new markdown files under `docs/`:

- lowercase only
- kebab-case
- suffix by topic (`-guide`, `-reference`, `-models`, `-api`, etc.)

Examples:


---
### テキストコンテナのハードウェア制限

Even G2のテキストコンテナには以下の制限があります（[詳細](docs/even-g2-text-container-hardware-limits-reference.md)）：
- 1画面最大約400〜500文字（API種別ごとに最大1,000〜2,000文字）
- フォント・サイズ・装飾指定不可、左上揃えのみ
- Unicodeはファームウェア内蔵フォント範囲のみ
- 背景色なし、ボーダーのみ装飾可
- 詳細は `docs/even-g2-text-container-hardware-limits-reference.md` を参照
---

- `feature-reading-flow-guide.md`
- `evenhub-audio-event-reference.md`
- `storage-schema-reference.md`

Avoid mixed casing and underscores (for example, `MyDoc.md` or `my_doc.md`).


---
### ページライフサイクルと公式ドキュメントリンク

Even G2のページライフサイクルやAPIの詳細は下記リファレンス・リンク集を参照してください：
- [docs/even-g2-page-lifecycle-reference.md](docs/even-g2-page-lifecycle-reference.md)
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
### 公式ドキュメント再取得用スキル

公式ドキュメントの更新に追従するため、AIが自動で再フェッチ・要約できるスキル（例: fetch_even_g2_official_doc）を用意してください。
- スキル名例: fetch_even_g2_official_doc
- 引数: ドキュメントURL, 要約対象セクション名
- 返却: 最新の要約テキスト
- 用途: ドキュメント更新時の自動反映や、開発時の最新仕様参照
---
