import { useEffect, useMemo, useState } from "react";
import { Text } from "./components/text";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import type { PageManager } from "./hud/page-manager";
import { AozoraReaderPage } from "./hud/pages/aozora-reader";
import { getWorkPageCount } from "./reader/pagination";
import { getReadingProgress, getReadingProgressMap } from "./reader/progress";
import {
	type AozoraWorkSummary,
	aozoraRepository,
} from "./repositories/aozora-repository";

function App({ manager }: { manager?: PageManager }) {
	const [searchQuery, setSearchQuery] = useState("");
	const [currentlyReadingWorks, setCurrentlyReadingWorks] = useState<
		AozoraWorkSummary[]
	>([]);
	const [loadingCurrentlyReading, setLoadingCurrentlyReading] = useState(false);
	const [loadingWorks, setLoadingWorks] = useState(false);
	const [worksError, setWorksError] = useState<string | null>(null);
	const [openingWorkId, setOpeningWorkId] = useState<string | null>(null);
	const [filteredWorks, setFilteredWorks] = useState<AozoraWorkSummary[]>([]);
	const [progressMap, setProgressMap] = useState(() => getReadingProgressMap());
	const isSearching = Boolean(searchQuery.trim());

	useEffect(() => {
		let mounted = true;
		(async () => {
			const normalized = searchQuery.trim();
			if (!normalized) {
				setFilteredWorks([]);
				setWorksError(null);
				setLoadingWorks(false);
				return;
			}

			setLoadingWorks(true);
			setWorksError(null);
			try {
				const items = await aozoraRepository.searchWorks(normalized);
				if (!mounted) return;
				setFilteredWorks(items);
			} catch (error) {
				if (!mounted) return;
				setWorksError(
					error instanceof Error ? error.message : "作品検索に失敗しました",
				);
			} finally {
				if (mounted) setLoadingWorks(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, [searchQuery]);

	const currentlyReadingIds = useMemo(() => {
		return Object.entries(progressMap)
			.sort(([, a], [, b]) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
			.map(([workId]) => workId)
			.slice(0, 5);
	}, [progressMap]);

	useEffect(() => {
		let mounted = true;

		if (isSearching) {
			setLoadingCurrentlyReading(false);
			return () => {
				mounted = false;
			};
		}

		if (currentlyReadingIds.length === 0) {
			setCurrentlyReadingWorks([]);
			setLoadingCurrentlyReading(false);
			return () => {
				mounted = false;
			};
		}

		setLoadingCurrentlyReading(true);
		void (async () => {
			const resolvedWorks = await Promise.all(
				currentlyReadingIds.map(async (workId) => {
					try {
						const work = await aozoraRepository.fetchWorkContentById(workId);
						const { content: _content, ...summary } = work;
						return summary;
					} catch {
						return null;
					}
				}),
			);

			if (!mounted) return;

			setCurrentlyReadingWorks(
				resolvedWorks.filter(
					(work): work is AozoraWorkSummary => work !== null,
				),
			);
			setLoadingCurrentlyReading(false);
		})();

		return () => {
			mounted = false;
		};
	}, [currentlyReadingIds, isSearching]);

	const onProgressChanged = () => {
		setProgressMap(getReadingProgressMap());
	};

	const openWork = async (work: AozoraWorkSummary) => {
		if (!manager) return;

		setOpeningWorkId(work.id);
		try {
			const fullWork = await aozoraRepository.fetchWorkContentById(work.id);
			const pageCount = getWorkPageCount(fullWork.content);
			const progress = getReadingProgress(work.id);
			const startPage = progress
				? Math.min(progress.pageIndex, Math.max(pageCount - 1, 0))
				: 0;

			await manager.load(
				new AozoraReaderPage(fullWork, startPage, onProgressChanged),
			);
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "作品本文の取得に失敗しました",
			);
		} finally {
			setOpeningWorkId(null);
		}
	};

	return (
		<div className="flex h-dvh flex-col bg-fourth-background">
			<div className="bg-third-background p-3">
				<Input
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
					placeholder="青空文庫から作品名・著者で検索"
				/>
				{isSearching ? (
					<Button
						type="button"
						variant="secondary"
						className="mt-2 w-full"
						onClick={() => setSearchQuery("")}
					>
						読書中の作品を表示
					</Button>
				) : null}
				{!manager ? (
					<Text
						size="normal-subtitle"
						className="mt-2 block text-muted-foreground"
					>
						ブラウザモード: 作品選択UIのみ表示中
					</Text>
				) : null}
			</div>

			<div className="flex-1 space-y-4 overflow-y-auto p-3">
				{isSearching && loadingWorks ? (
					<Text size="normal-body" className="text-muted-foreground">
						作品一覧を取得中…
					</Text>
				) : null}
				{worksError ? (
					<Text size="normal-body" className="text-destructive">
						{worksError}
					</Text>
				) : null}

				{isSearching ? (
					<section className="space-y-2">
						<Text size="large-title" className="text-muted-foreground">
							検索結果
						</Text>
						{filteredWorks.length === 0 && !loadingWorks ? (
							<div className="flex min-h-44 items-center justify-center">
								<Text size="normal-body" className="text-muted-foreground">
									検索条件に一致する作品がありません
								</Text>
							</div>
						) : (
							<div className="space-y-1.5">
								{filteredWorks.map((work) => {
									const progress = progressMap[work.id];
									return (
										<Button
											key={work.id}
											type="button"
											variant="secondary"
											disabled={openingWorkId === work.id}
											className="h-auto w-full items-start justify-between py-2"
											onClick={() => void openWork(work)}
										>
											<span className="text-left">
												{work.title}（{work.author}）
											</span>
											{openingWorkId === work.id ? (
												<span className="text-xs text-muted-foreground">
													本文を取得中…
												</span>
											) : null}
											{progress ? (
												<span className="text-xs text-muted-foreground">
													続きから {(progress.pageIndex ?? 0) + 1}/
													{progress.totalPages}
												</span>
											) : (
												<span className="text-xs text-muted-foreground">
													最初から
												</span>
											)}
										</Button>
									);
								})}
							</div>
						)}
					</section>
				) : (
					<section className="space-y-2">
						<Text size="large-title" className="text-muted-foreground">
							読書中の作品
						</Text>
						{loadingCurrentlyReading ? (
							<Text size="normal-body" className="text-muted-foreground">
								読書中の作品を取得中…
							</Text>
						) : currentlyReadingWorks.length === 0 ? (
							<div className="flex min-h-44 items-center justify-center">
								<Text size="normal-body" className="text-muted-foreground">
									まだ読書中の作品はありません
								</Text>
							</div>
						) : (
							<div className="space-y-1.5">
								{currentlyReadingWorks.map((work) => {
									const progress = progressMap[work.id];
									return (
										<Button
											key={`current-${work.id}`}
											type="button"
											variant="secondary"
											disabled={openingWorkId === work.id}
											className="h-auto w-full items-start justify-between py-2"
											onClick={() => void openWork(work)}
										>
											<span className="text-left">
												{work.title}（{work.author}）
											</span>
											<span className="text-xs text-muted-foreground">
												{(progress?.pageIndex ?? 0) + 1}/
												{progress?.totalPages ?? "-"}
											</span>
										</Button>
									);
								})}
							</div>
						)}
					</section>
				)}

				<Text size="normal-detail" className="pb-4 text-muted-foreground">
					作品をタップすると Even G2 で開き、保存済みの位置から再開します
				</Text>
			</div>
		</div>
	);
}

export default App;
