# even-g2-text-container-hardware-limits-reference.md

## Even G2 テキストコンテナのハードウェア制限まとめ

**出典: [Even G2公式ドキュメント - Display > Text Containers](https://hub.evenrealities.com/docs/guides/display#text-containers)**

### 画面仕様
- 片目あたり 576 x 288 ピクセルのキャンバス
- 4ビット（16段階）グリーンスケール表示
- 原点は左上（X:右方向増加, Y:下方向増加）

### コンテナ共通仕様
- 配置: 絶対ピクセル座標 (xPosition, yPosition, width, height)
- 最大: 画像コンテナ4個 + その他8個/ページ（混在可）
- isEventCapture: 1 のコンテナが必須（入力イベント受信）
- 重なり順: 宣言順のみ（z-indexなし）

### テキストコンテナ固有仕様
- 内容はプレーンテキストのみ（左上揃え、フォント/サイズ/太字/斜体指定不可）
- テキストはコンテナ幅で自動折り返し
- `\n` で改行可
- Unicode対応（ファームウェア内蔵フォント範囲のみ）
- 1画面フルサイズで約400〜500文字表示可能
- テキスト中央寄せはスペースで手動調整
- **コンテンツ長制限:**
    - createStartUpPageContainer: 最大1,000文字
    - textContainerUpgrade: 最大2,000文字
    - rebuildPageContainer: 最大1,000文字
- 内容が溢れ、かつ isEventCapture:1 の場合は内部スクロールが有効
- インプレース更新: `textContainerUpgrade` API推奨（高速・ちらつきなし）

### ボーダー装飾
- borderWidth: 0〜5（0=なし）
- borderColor: 0〜15（グレースケール段階）
- borderRadius: 0〜10（角丸）
- paddingLength: 0〜32（全辺均等パディング）
- 背景色・塗りつぶし不可（装飾はボーダーのみ）

### フォント・Unicode
- フォントは1種類のみ（サイズ・太字・斜体不可、等幅ではない）
- サポート外文字は無視される
- UI構築用の記号例: ━ ─ █▇▆▅▄▃▂▁ ▲△▶▷▼▽◀◁ ●○ ■□ ★☆ ╭╮╯╰ │─ ♠♣♥♦
- 詳細なグリフ表: [community G2 notes](https://github.com/nickustinov/even-g2-notes/blob/main/G2.md)

---

## AGENTS.md への記載例（追記用）

---
### テキストコンテナのハードウェア制限

Even G2のテキストコンテナには以下の制限があります（[詳細](docs/even-g2-text-container-hardware-limits-reference.md)）：
- 1画面最大約400〜500文字（API種別ごとに最大1,000〜2,000文字）
- フォント・サイズ・装飾指定不可、左上揃えのみ
- Unicodeはファームウェア内蔵フォント範囲のみ
- 背景色なし、ボーダーのみ装飾可
- 詳細は `docs/even-g2-text-container-hardware-limits-reference.md` を参照
---
