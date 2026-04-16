import {
	GLASS_TEXTCONTAINER_MAX_BYTES,
	GLASS_TEXTCONTAINER_MAX_FULLWIDTH_PER_LINE,
	GLASS_TEXTCONTAINER_MAX_LINES,
} from "@/constants";

// ページ先頭に必ず付与されるタイトル＋ページ番号＋改行分
export function getPageHeader(
	title: string,
	pageNum: number,
	totalPages: number,
): string {
	return `${title}  ${pageNum}/${totalPages}`;
}

// TextContainerProperty.content 上限(1000)を想定し、UTF-8 バイトで余裕を持たせる

const MAX_BYTES_PER_PAGE = GLASS_TEXTCONTAINER_MAX_BYTES;
const MAX_LINES_PER_PAGE = GLASS_TEXTCONTAINER_MAX_LINES;
const MAX_FULLWIDTH_PER_LINE = GLASS_TEXTCONTAINER_MAX_FULLWIDTH_PER_LINE;

// 文字の全角換算幅を返す（全角:1, 半角:0.5）
function getCharWidth(ch: string): number {
	// Unicodeの全角判定: CJK, 全角カタカナ, 全角記号など
	// 半角英数・半角カナ・記号は0.5、それ以外は1
	// 参考: /[\uFF01-\uFF60\uFFE0-\uFFE6]/
	if (
		ch.match(
			/[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF60\uFFE0-\uFFE6]/,
		)
	) {
		return 1;
	}
	// 半角カナ
	if (ch.match(/[\uFF61-\uFF9F]/)) {
		return 0.5;
	}
	// ASCII
	if (ch.match(/[\u0020-\u007E]/)) {
		return 0.5;
	}
	// その他は全角扱い
	return 1;
}

function splitByUtf8BytesAndLinesWithHeader(
	text: string,
	maxBytes: number,
	maxLines: number,
	headerGen: (pageNum: number, totalPages: number) => string,
): string[] {
	const encoder = new TextEncoder();
	const chunks: string[] = [];
	let current = "";
	let currentBytes = 0;
	let currentLines = 0;
	let pageNum = 1;
	const totalPages = 9999; // 仮置き、あとで再計算

	// 1ページ目のheaderを仮で計算（タイトル行＋空行で2行）
	let header = headerGen(pageNum, totalPages) + "\n";
	let headerBytes = encoder.encode(header).length;
	let headerLines = 2; // タイトル行＋空行

	let lineWidth = 0; // 現在行の全角幅

	for (const ch of Array.from(text)) {
		const chBytes = encoder.encode(ch).length;
		const chWidth = getCharWidth(ch);

		// 強制改行（横幅制限）
		if (lineWidth + chWidth > MAX_FULLWIDTH_PER_LINE) {
			current += "\n";
			currentLines++;
			lineWidth = 0;
		}

		if (ch === "\n") {
			currentLines++;
			lineWidth = 0;
		} else {
			lineWidth += chWidth;
		}

		// 行数は「改行数+1」になるように判定
		// 空でも1行カウントする
		const totalLines = currentLines + headerLines + 1;
		if (
			(currentBytes + chBytes + headerBytes > maxBytes ||
				totalLines > maxLines) &&
			current.length > 0
		) {
			chunks.push(current);
			current = ch;
			currentBytes = chBytes;
			// 改行で始まる場合も1行としてカウント
			currentLines = 1;
			lineWidth = ch === "\n" ? 0 : chWidth;
			pageNum++;
			header = headerGen(pageNum, totalPages) + "\n";
			headerBytes = encoder.encode(header).length;
			headerLines = 2;
		} else {
			current += ch;
			currentBytes += chBytes;
		}
	}

	if (current.length > 0) {
		chunks.push(current);
	}

	return chunks;
}

export function paginateWorkText(content: string, title?: string): string[] {
	const normalized = content.replace(/\r\n/g, "\n").trim();
	if (!normalized) return ["本文がありません"];
	// headerGen: ページ番号・タイトル・改行を含む
	const headerGen = (pageNum: number, totalPages: number) =>
		getPageHeader(title ?? "", pageNum, totalPages);
	return splitByUtf8BytesAndLinesWithHeader(
		normalized,
		MAX_BYTES_PER_PAGE,
		MAX_LINES_PER_PAGE,
		headerGen,
	);
}

export function getWorkPageCount(content: string): number {
	return paginateWorkText(content).length;
}
