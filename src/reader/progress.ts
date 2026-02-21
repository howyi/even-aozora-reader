const PROGRESS_STORAGE_KEY = "aozora-reader-progress/v1";

export type ReadingProgress = {
	pageIndex: number;
	totalPages: number;
	updatedAt: number;
};

export type ReadingProgressMap = Record<string, ReadingProgress>;

export function getReadingProgressMap(): ReadingProgressMap {
	const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
	if (!raw) return {};

	try {
		const parsed = JSON.parse(raw) as ReadingProgressMap;
		if (typeof parsed !== "object" || parsed === null) return {};
		return parsed;
	} catch {
		return {};
	}
}

export function getReadingProgress(
	bookId: string,
): ReadingProgress | undefined {
	return getReadingProgressMap()[bookId];
}

export function saveReadingProgress(
	bookId: string,
	pageIndex: number,
	totalPages: number,
): void {
	const progressMap = getReadingProgressMap();
	progressMap[bookId] = {
		pageIndex,
		totalPages,
		updatedAt: Date.now(),
	};
	window.localStorage.setItem(
		PROGRESS_STORAGE_KEY,
		JSON.stringify(progressMap),
	);
}

export function removeReadingProgress(bookId: string): void {
	const progressMap = getReadingProgressMap();
	if (!(bookId in progressMap)) return;
	delete progressMap[bookId];
	window.localStorage.setItem(
		PROGRESS_STORAGE_KEY,
		JSON.stringify(progressMap),
	);
}
