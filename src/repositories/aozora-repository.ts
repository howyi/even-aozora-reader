export type AozoraWorkSummary = {
	id: string;
	title: string;
	titleReading?: string;
	author: string;
	authorReading?: string;
	textFileUrl: string | null;
	xhtmlHtmlFileUrl: string | null;
};

export type AozoraWork = AozoraWorkSummary & {
	content: string;
};

type AozoraSearchApiResponse = {
	total: number;
	limit: number;
	items: AozoraWorkSummary[];
};

type AozoraTextApiResponse = {
	work: AozoraWorkSummary;
	text: string;
};

const contentCache = new Map<string, string>();
const summaryCache = new Map<string, AozoraWorkSummary>();
const AOZORA_API_BASE_URL = "https://api.sbox.studio/api/aozora-bunko";
const AOZORA_SEARCH_API_URL = `${AOZORA_API_BASE_URL}/search`;
const AOZORA_TEXT_API_URL = `${AOZORA_API_BASE_URL}/text`;

function isAozoraSummary(value: unknown): value is AozoraWorkSummary {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return (
		typeof item.id === "string" &&
		typeof item.title === "string" &&
		typeof item.author === "string" &&
		(item.textFileUrl === null || typeof item.textFileUrl === "string") &&
		(item.xhtmlHtmlFileUrl === null ||
			typeof item.xhtmlHtmlFileUrl === "string")
	);
}

function normalizeSummary(summary: AozoraWorkSummary): AozoraWorkSummary {
	return {
		id: summary.id,
		title: summary.title,
		titleReading: summary.titleReading,
		author: summary.author,
		authorReading: summary.authorReading,
		textFileUrl: summary.textFileUrl,
		xhtmlHtmlFileUrl: summary.xhtmlHtmlFileUrl,
	};
}

async function fetchSearchItems(query: string): Promise<AozoraWorkSummary[]> {
	const endpoint = new URL(AOZORA_SEARCH_API_URL);
	endpoint.searchParams.set("q", query.trim());
	endpoint.searchParams.set("limit", "100");

	const response = await fetch(endpoint.toString());
	if (!response.ok) {
		throw new Error(`検索APIの呼び出しに失敗しました: HTTP ${response.status}`);
	}

	const data = (await response.json()) as AozoraSearchApiResponse;
	if (!Array.isArray(data?.items)) {
		throw new Error("検索APIレスポンスの形式が不正です");
	}

	const normalizedItems = data.items
		.filter(isAozoraSummary)
		.map(normalizeSummary);

	for (const item of normalizedItems) {
		summaryCache.set(item.id, item);
	}

	return normalizedItems;
}

function normalizeAozoraText(text: string): string {
	return text
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

async function fetchWorkTextById(id: string): Promise<AozoraTextApiResponse> {
	const endpoint = new URL(AOZORA_TEXT_API_URL);
	endpoint.searchParams.set("id", id);

	const response = await fetch(endpoint.toString());
	if (!response.ok) {
		throw new Error(`本文APIの呼び出しに失敗しました: HTTP ${response.status}`);
	}

	const data = (await response.json()) as AozoraTextApiResponse;
	if (!data || !isAozoraSummary(data.work) || typeof data.text !== "string") {
		throw new Error("本文APIレスポンスの形式が不正です");
	}

	return {
		work: normalizeSummary(data.work),
		text: normalizeAozoraText(data.text),
	};
}

export class AozoraRepository {
	async searchWorks(query: string): Promise<AozoraWorkSummary[]> {
		if (!query.trim()) {
			return [];
		}

		const items = await fetchSearchItems(query);
		return items.filter((work) => !!work.textFileUrl);
	}

	async fetchWorkContentById(id: string): Promise<AozoraWork> {
		const cached = contentCache.get(id);
		if (cached) {
			const cachedSummary = summaryCache.get(id);
			if (!cachedSummary) {
				throw new Error("作品情報キャッシュが見つかりません");
			}

			return { ...cachedSummary, content: cached };
		}

		const { work, text } = await fetchWorkTextById(id);
		summaryCache.set(work.id, work);

		if (!text) {
			throw new Error("本文の抽出に失敗しました");
		}

		contentCache.set(work.id, text);

		return { ...work, content: text };
	}

	async listWorks(): Promise<AozoraWorkSummary[]> {
		return this.searchWorks("");
	}

	async getWorkById(id: string): Promise<AozoraWork> {
		return this.fetchWorkContentById(id);
	}
}

export const aozoraRepository = new AozoraRepository();
