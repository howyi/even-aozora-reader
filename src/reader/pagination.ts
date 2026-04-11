// TextContainerProperty.content 上限(1000)を想定し、UTF-8 バイトで余裕を持たせる
const MAX_BYTES_PER_PAGE = 700;

function splitByUtf8Bytes(text: string, maxBytes: number): string[] {
	const encoder = new TextEncoder();
	const chunks: string[] = [];
	let current = "";
	let currentBytes = 0;

	for (const ch of Array.from(text)) {
		const chBytes = encoder.encode(ch).length;
		if (currentBytes + chBytes > maxBytes && current.length > 0) {
			chunks.push(current);
			current = ch;
			currentBytes = chBytes;
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

export function paginateWorkText(content: string): string[] {
	const normalized = content.replace(/\r\n/g, "\n").trim();
	if (!normalized) return ["本文がありません"];
	return splitByUtf8Bytes(normalized, MAX_BYTES_PER_PAGE);
}

export function getWorkPageCount(content: string): number {
	return paginateWorkText(content).length;
}
