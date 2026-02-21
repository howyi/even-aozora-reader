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
		const headerHeight = 34;
		const currentPage = this.pages[this.currentPageIndex] ?? "";
		const topHint = this.currentPageIndex >= 1 ? "*ダブルクリックで戻る" : "";
		const bodyContent = [topHint, currentPage, "*クリックで次のページ"]
			.filter((line) => line.length > 0)
			.join("\n\n");

		return new RebuildPageContainer({
			containerTotalNum: 2,
			textObject: [
				new TextContainerProperty({
					xPosition: 12,
					yPosition: 0,
					width: GLASS_SCREEN_WIDTH - 24,
					height: headerHeight,
					borderWidth: 0,
					borderColor: 5,
					paddingLength: 2,
					containerID: 1,
					containerName: "hdr",
					content: `${this.work.title}  ${this.currentPageIndex + 1}/${this.pages.length}`,
					isEventCapture: 0,
				}),
				new TextContainerProperty({
					xPosition: 12,
					yPosition: headerHeight,
					width: GLASS_SCREEN_WIDTH - 24,
					height: GLASS_SCREEN_HEIGHT - headerHeight,
					borderWidth: 0,
					borderColor: 5,
					paddingLength: 2,
					containerID: 2,
					containerName: "body",
					content: bodyContent,
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
		await this.bridge.rebuildPageContainer(this.render());
		this.persistProgress();
	}

	private persistProgress(): void {
		saveReadingProgress(this.work.id, this.currentPageIndex, this.pages.length);
		this.onProgressChanged?.();
	}
}
