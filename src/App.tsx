import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import backIcon from "./components/icons/back.svg";
import crossIcon from "./components/icons/cross.svg";
import disconnectedIcon from "./components/icons/disconnected.svg";
import goIcon from "./components/icons/go.svg";
import searchIcon from "./components/icons/search.svg";
import { Text } from "./components/text";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import type { PageManager } from "./hud/page-manager";
import { AozoraReaderPage } from "./hud/pages/aozora-reader";
import { SplashText } from "./hud/pages/splash-text";
import { getWorkPageCount, paginateWorkText } from "./reader/pagination";
import {
	getReadingProgress,
	getReadingProgressMap,
	removeReadingProgress,
} from "./reader/progress";
import {
	type AozoraWork,
	type AozoraWorkSummary,
	aozoraRepository,
} from "./repositories/aozora-repository";

function App({ manager }: { manager?: PageManager }) {
	const SEARCH_DEBOUNCE_MS = 300;
	const SEARCH_THROTTLE_MS = 800;

	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
	const [currentlyReadingWorks, setCurrentlyReadingWorks] = useState<
		AozoraWorkSummary[]
	>([]);
	const [loadingCurrentlyReading, setLoadingCurrentlyReading] = useState(false);
	const [loadingWorks, setLoadingWorks] = useState(false);
	const [worksError, setWorksError] = useState<string | null>(null);
	const [openingWorkId, setOpeningWorkId] = useState<string | null>(null);
	const [filteredWorks, setFilteredWorks] = useState<AozoraWorkSummary[]>([]);
	const [progressMap, setProgressMap] = useState(() => getReadingProgressMap());
	const [activeWork, setActiveWork] = useState<AozoraWork | null>(null);
	const [activePageIndex, setActivePageIndex] = useState(0);
	const [viewMode, setViewMode] = useState<"list" | "detail">("list");
	const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
	const [detailHeaderHeight, setDetailHeaderHeight] = useState(0);
	const detailPageRefs = useRef<Record<number, HTMLDivElement | null>>({});
	const webviewScrollRef = useRef<HTMLDivElement | null>(null);
	const detailHeaderRef = useRef<HTMLDivElement | null>(null);
	const lastSearchExecutedAtRef = useRef(0);
	const isSearching = Boolean(searchQuery.trim());

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			window.clearTimeout(timer);
		};
	}, [searchQuery]);

	useEffect(() => {
		let mounted = true;
		let timer: number | undefined;

		const normalized = debouncedSearchQuery.trim();
		if (!normalized) {
			setFilteredWorks([]);
			setWorksError(null);
			setLoadingWorks(false);
			return () => {
				mounted = false;
			};
		}

		const executeSearch = async () => {
			setLoadingWorks(true);
			setWorksError(null);
			lastSearchExecutedAtRef.current = Date.now();

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
		};

		const elapsed = Date.now() - lastSearchExecutedAtRef.current;
		const wait = Math.max(0, SEARCH_THROTTLE_MS - elapsed);

		if (wait === 0) {
			void executeSearch();
		} else {
			timer = window.setTimeout(() => {
				void executeSearch();
			}, wait);
		}

		return () => {
			mounted = false;
			if (timer !== undefined) {
				window.clearTimeout(timer);
			}
		};
	}, [debouncedSearchQuery]);

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
		if (!activeWork) return;
		const progress = getReadingProgress(activeWork.id);
		if (!progress) return;
		setActivePageIndex(progress.pageIndex);
	};

	const openOnGlasses = async (work: AozoraWork, startPage: number) => {
		if (!manager) return;
		await manager.load(
			new AozoraReaderPage(work, startPage, onProgressChanged),
		);
	};

	const openWork = async (
		work: AozoraWorkSummary,
		targetPageIndex?: number,
	) => {
		setOpeningWorkId(work.id);
		try {
			const fullWork = await aozoraRepository.fetchWorkContentById(work.id);
			const pageCount = getWorkPageCount(fullWork.content);
			const progress = getReadingProgress(work.id);
			const fallbackPage = progress
				? Math.min(progress.pageIndex, Math.max(pageCount - 1, 0))
				: 0;
			const startPage = Math.min(
				targetPageIndex ?? fallbackPage,
				Math.max(pageCount - 1, 0),
			);

			await openOnGlasses(fullWork, startPage);
			setActiveWork(fullWork);
			setActivePageIndex(startPage);
			setViewMode("detail");
			setIsConfirmingRemove(false);
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : "作品本文の取得に失敗しました",
			);
		} finally {
			setOpeningWorkId(null);
		}
	};

	const pageChunks = useMemo(() => {
		if (!activeWork) return [];
		return paginateWorkText(activeWork.content);
	}, [activeWork]);

	useEffect(() => {
		if (viewMode !== "detail") return;
		const updateHeaderHeight = () => {
			setDetailHeaderHeight(
				detailHeaderRef.current?.getBoundingClientRect().height ?? 0,
			);
		};
		updateHeaderHeight();
		const timer = window.setTimeout(updateHeaderHeight, 0);
		window.addEventListener("resize", updateHeaderHeight);

		return () => {
			window.clearTimeout(timer);
			window.removeEventListener("resize", updateHeaderHeight);
		};
	}, [viewMode]);

	const getDetailScrollOffset = useCallback(() => {
		return detailHeaderHeight + 12;
	}, [detailHeaderHeight]);

	const scrollToDetailPage = useCallback(
		(index: number) => {
			const container = webviewScrollRef.current;
			const target = detailPageRefs.current[index];
			if (!container || !target) return;
			const top = target.offsetTop - getDetailScrollOffset();

			container.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
		},
		[getDetailScrollOffset],
	);

	useEffect(() => {
		if (viewMode !== "detail" || !activeWork) return;
		const hasSavedProgress = Boolean(progressMap[activeWork.id]);
		if (!hasSavedProgress) return;

		const timer = window.setTimeout(() => {
			scrollToDetailPage(activePageIndex);
		}, 0);

		return () => {
			window.clearTimeout(timer);
		};
	}, [viewMode, activeWork, activePageIndex, progressMap, scrollToDetailPage]);

	useEffect(() => {
		if (viewMode !== "detail") {
			setIsConfirmingRemove(false);
		}
	}, [viewMode]);

	const openActivePageOnGlasses = async (pageIndex: number) => {
		if (!activeWork) return;
		await openOnGlasses(activeWork, pageIndex);
		setActivePageIndex(pageIndex);
	};

	const onRemoveFromReading = async () => {
		if (!activeWork) return;
		removeReadingProgress(activeWork.id);
		setProgressMap(getReadingProgressMap());
		setActiveWork(null);
		setActivePageIndex(0);
		setViewMode("list");
		setIsConfirmingRemove(false);
		setSearchQuery("");
		detailPageRefs.current = {};
		if (manager) {
			await manager.load(new SplashText("アプリで作品を選択"));
		}
	};

	const onClickRemoveButton = async () => {
		if (!isConfirmingRemove) {
			setIsConfirmingRemove(true);
			return;
		}
		await onRemoveFromReading();
	};

	const scrollWebviewToTop = () => {
		webviewScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
	};

	const scrollToCurrentProgress = () => {
		scrollToDetailPage(activePageIndex);
	};

	const stopReading = () => {
		window.location.reload();
	};

	if (!manager) {
		return (
			<div className="flex h-dvh items-center justify-center px-6">
				<div className="flex w-full max-w-120 flex-col items-center gap-3 text-center">
					<img
						src={disconnectedIcon}
						alt=""
						aria-hidden="true"
						className="size-10 opacity-80"
					/>
					<Text size="normal-title">Even G2が接続されていません</Text>
					<Text size="normal-body" className="text-muted-foreground">
						接続状態を確認してから再試行してください
					</Text>
					<Button type="button" className="mt-1" onClick={stopReading}>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-dvh flex-col">
			<div className="">
				<div className="mx-auto w-full max-w-120 px-3 py-2">
					{viewMode === "list" ? (
						<>
							<div className="relative">
								<img
									src={searchIcon}
									alt=""
									aria-hidden="true"
									className="opacity-50 pointer-events-none absolute top-1/2 left-2.5 size-6 -translate-y-1/2"
								/>
								<Input
									className="pr-10 py-1.5 pl-10 font-semibold"
									value={searchQuery}
									onChange={(event) => setSearchQuery(event.target.value)}
									placeholder="青空文庫から作品名・著者で検索"
								/>
								{searchQuery ? (
									<button
										type="button"
										className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground"
										onClick={() => setSearchQuery("")}
										aria-label="検索をクリア"
									>
										<img
											src={crossIcon}
											alt=""
											aria-hidden="true"
											className="size-4"
										/>
									</button>
								) : null}
							</div>
							{activeWork ? (
								<div className="mt-2 space-y-1.5">
									<Button
										type="button"
										className="w-full justify-center gap-1.5"
										onClick={() => setViewMode("detail")}
									>
										<img
											src={goIcon}
											alt=""
											aria-hidden="true"
											className="size-4"
										/>
										<span>読書中の作品を表示</span>
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="xs"
										className="w-full text-muted-foreground"
										onClick={stopReading}
									>
										読書をやめる
									</Button>
								</div>
							) : null}
						</>
					) : null}
				</div>
			</div>

			<div ref={webviewScrollRef} className="flex-1 overflow-y-auto">
				<div className="mx-auto w-full max-w-120 space-y-4 p-4">
					{viewMode === "detail" && activeWork ? (
						<section className="space-y-3">
							<div
								ref={detailHeaderRef}
								className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-2"
							>
								<div className="flex items-start gap-2">
									<Button
										type="button"
										variant="secondary"
										size="sm"
										className="shrink-0 gap-1"
										onClick={() => setViewMode("list")}
									>
										<img
											src={backIcon}
											alt=""
											aria-hidden="true"
											className="size-4"
										/>
										<span>戻る</span>
									</Button>
									<div className="min-w-0">
										<button
											type="button"
											className="w-full text-left hover:underline"
											onClick={scrollWebviewToTop}
										>
											<Text
												size="normal-title"
												className="block wrap-break-word"
											>
												{activeWork.title}
											</Text>
										</button>
										<Text
											size="normal-detail"
											className="text-muted-foreground"
										>
											{activeWork.author}
										</Text>
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="ghost"
									size="xs"
									className="text-muted-foreground"
									onClick={stopReading}
								>
									読書をやめる
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="xs"
									className="text-muted-foreground"
									onClick={scrollToCurrentProgress}
								>
									現在の進捗までスクロールする
								</Button>
								<Button
									type="button"
									variant={isConfirmingRemove ? "destructive" : "ghost"}
									size="xs"
									className="text-muted-foreground"
									onClick={() => void onClickRemoveButton()}
								>
									{isConfirmingRemove ? "削除を確認" : "読書進捗を削除"}
								</Button>
							</div>

							<div className="space-y-2 pb-4">
								{pageChunks.map((page, index) => {
									const isActive = index === activePageIndex;
									return (
										<div
											key={`detail-page-${activeWork.id}-${index}`}
											ref={(el) => {
												detailPageRefs.current[index] = el;
											}}
											style={{
												scrollMarginTop: `${detailHeaderHeight + 12}px`,
											}}
											className="space-y-1 rounded-md bg-secondary p-3"
										>
											<button
												type="button"
												onClick={() => void openActivePageOnGlasses(index)}
												className="text-muted-foreground"
											>
												<Text
													size="normal-detail"
													className={
														isActive
															? "text-foreground underline"
															: "text-muted-foreground underline"
													}
												>
													{index + 1}/{pageChunks.length}
												</Text>
											</button>
											<Text
												size="normal-body"
												className="block whitespace-pre-wrap wrap-break-word"
											>
												{page}
											</Text>
										</div>
									);
								})}
							</div>
						</section>
					) : null}

					{viewMode === "list" ? (
						<>
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
									<Text
										size="normal-subtitle"
										className="text-muted-foreground"
									>
										検索結果
									</Text>
									{filteredWorks.length === 0 && !loadingWorks ? (
										<div className="flex min-h-44 items-center justify-center">
											<Text
												size="normal-body"
												className="text-muted-foreground"
											>
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
														className="h-auto w-full items-start justify-between py-2 whitespace-normal"
														onClick={() => void openWork(work)}
													>
														<div className="min-w-0 flex-1 text-left">
															<Text
																size="normal-body"
																className="block whitespace-normal break-all"
															>
																{work.title}
															</Text>
															<Text
																size="normal-detail"
																className="block text-muted-foreground"
															>
																{work.author}
															</Text>
														</div>
														<div className="ml-2 shrink-0 self-center text-center">
															{openingWorkId === work.id ? (
																<Text
																	size="normal-detail"
																	className="text-muted-foreground"
																>
																	本文を取得中…
																</Text>
															) : null}
															{progress ? (
																<Text
																	size="normal-detail"
																	className="text-muted-foreground"
																>
																	続きから {(progress.pageIndex ?? 0) + 1}/
																	{progress.totalPages}
																</Text>
															) : (
																<Text
																	size="normal-detail"
																	className="text-muted-foreground"
																>
																	最初から
																</Text>
															)}
														</div>
													</Button>
												);
											})}
										</div>
									)}
								</section>
							) : (
								<section className="space-y-2">
									<Text
										size="normal-subtitle"
										className="text-muted-foreground"
									>
										進捗のある作品
									</Text>
									{loadingCurrentlyReading ? (
										<Text size="normal-body" className="text-muted-foreground">
											読書中の作品を取得中…
										</Text>
									) : currentlyReadingWorks.length === 0 ? (
										<div className="flex min-h-44 items-center justify-center">
											<Text
												size="normal-body"
												className="text-muted-foreground"
											>
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
														className="h-auto w-full items-start justify-between py-2 whitespace-normal"
														onClick={() => void openWork(work)}
													>
														<div className="min-w-0 flex-1 text-left">
															<Text
																size="normal-body"
																className="block whitespace-normal break-all"
															>
																{work.title}
															</Text>
															<Text
																size="normal-detail"
																className="block text-muted-foreground"
															>
																{work.author}
															</Text>
														</div>
														<Text
															size="normal-detail"
															className="ml-2 shrink-0 self-center text-center text-muted-foreground"
														>
															{(progress?.pageIndex ?? 0) + 1}/
															{progress?.totalPages ?? "-"}
														</Text>
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
						</>
					) : null}
				</div>
			</div>
		</div>
	);
}

export default App;
