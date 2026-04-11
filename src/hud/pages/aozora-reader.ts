import {
	RebuildPageContainer,
	TextContainerProperty,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { paginateWorkText } from "@/reader/pagination";
import { saveReadingProgress } from "@/reader/progress";
import type { AozoraWork } from "@/repositories/aozora-repository";
import { BasePage } from "./base";

export class AozoraReaderPage extends BasePage {
	private static readonly MAX_BODY_BYTES = 900;
	private readonly encoder = new TextEncoder();
	private work: AozoraWork;
	private pages: string[];
	private currentPageIndex: number;
	private onProgressChanged?: () => void;

	constructor(
		work: AozoraWork,
		initialPageIndex = 0,
		onProgressChanged?: () => void,
	) {
		super();
		this.work = work;
		this.pages = paginateWorkText(work.content);
		this.currentPageIndex = this.clampPageIndex(initialPageIndex);
		this.onProgressChanged = onProgressChanged;
	}

	onClick(): void {
		if (this.currentPageIndex >= this.pages.length - 1) return;
		this.currentPageIndex += 1;
		void this.refresh();
	}

	onDoubleClick(): void {
		if (this.currentPageIndex <= 0) return;
		this.currentPageIndex -= 1;
		void this.refresh();
	}

	async afterRender(): Promise<void> {
		this.persistProgress();
	}

	render(): RebuildPageContainer {
		const currentPage = this.pages[this.currentPageIndex] ?? "";
		const headerText = `${this.work.title}  ${this.currentPageIndex + 1}/${this.pages.length}`;
		const topHint = this.currentPageIndex >= 1 ? "*ダブルクリックで戻る" : "";
		const pageContent = this.fitToContainerLimit(
			[topHint, currentPage, "*クリックで次のページ"]
				.filter((line) => line.length > 0)
				.join("\n\n"),
			AozoraReaderPage.MAX_BODY_BYTES,
		);
		const mergedContent = this.fitToContainerLimit(
			[headerText, pageContent].join("\n\n"),
			AozoraReaderPage.MAX_BODY_BYTES,
		);

		return new RebuildPageContainer({
			containerTotalNum: 1,
			textObject: [
				new TextContainerProperty({
					xPosition: 0,
					yPosition: 0,
					width: GLASS_SCREEN_WIDTH,
					height: GLASS_SCREEN_HEIGHT,
					borderWidth: 0,
					borderColor: 0,
					paddingLength: 0,
					containerID: 1,
					containerName: "read",
					content: mergedContent,
					isEventCapture: 1,
				}),
			],
		});
	}

	private clampPageIndex(index: number): number {
		if (index < 0) return 0;
		if (index > this.pages.length - 1) return this.pages.length - 1;
		return index;
	}

	private async refresh(): Promise<void> {
		if (!this.bridge) return;
		const rebuilt = await this.bridge.rebuildPageContainer(this.render());
		if (!rebuilt) {
			throw new Error("グラス本文の更新に失敗しました");
		}
		this.persistProgress();
	}

	private fitToContainerLimit(text: string, maxBytes: number): string {
		if (this.encoder.encode(text).length <= maxBytes) {
			return text;
		}

		const ellipsis = "…";
		let out = "";
		for (const ch of Array.from(text)) {
			const next = out + ch;
			if (this.encoder.encode(next + ellipsis).length > maxBytes) {
				break;
			}
			out = next;
		}
		return out.length > 0 ? `${out}${ellipsis}` : ellipsis;
	}

	private persistProgress(): void {
		saveReadingProgress(this.work.id, this.currentPageIndex, this.pages.length);
		this.onProgressChanged?.();
	}
}
