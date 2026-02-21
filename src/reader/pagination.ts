const MAX_CHARS_PER_PAGE = 2000;

export function paginateWorkText(content: string): string[] {
	const normalized = content.replace(/\r\n/g, "\n").trim();
	if (!normalized) return ["本文がありません"];

	const chars = Array.from(normalized);
	const pages: string[] = [];

	for (let i = 0; i < chars.length; i += MAX_CHARS_PER_PAGE) {
		pages.push(chars.slice(i, i + MAX_CHARS_PER_PAGE).join(""));
	}

	return pages;
}

export function getWorkPageCount(content: string): number {
	return paginateWorkText(content).length;
}
