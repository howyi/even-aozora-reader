import {
	RebuildPageContainer,
	TextContainerProperty,
	TextContainerUpgrade,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { BasePage } from "./base";
import { TestList } from "./test-list";

export class TestText extends BasePage {
	private clickNum = 0;
	private doubleClickNum = 0;

	onScrollDown(): void {
		this.loadPage?.(new TestList());
	}

	onClick(): void {
		this.clickNum++;
		this.bridge?.textContainerUpgrade(
			new TextContainerUpgrade({
				containerID: 1,
				content: `click: ${this.clickNum}`,
			}),
		);
	}

	onDoubleClick(): void {
		this.doubleClickNum++;
		this.bridge?.textContainerUpgrade(
			new TextContainerUpgrade({
				containerID: 2,
				content: `double click: ${this.doubleClickNum}`,
			}),
		);
	}

	render(): RebuildPageContainer {
		const containerHeight = GLASS_SCREEN_HEIGHT / 3;
		const textContainers: TextContainerProperty[] = [];
		[1, 2, 3].forEach((id, idx) => {
			textContainers.push(
				new TextContainerProperty({
					xPosition: 20,
					yPosition: idx * containerHeight,
					width: GLASS_SCREEN_WIDTH - 40,
					height: containerHeight,
					borderWidth: 0,
					borderColor: 5,
					paddingLength: 2,
					containerID: id,
					containerName: `item-${idx + 1}`,
					content: "操作待機中",
					isEventCapture: idx === 1 ? 1 : 0,
				}),
			);
		});
		return new RebuildPageContainer({
			containerTotalNum: 3,
			textObject: textContainers,
		});
	}
}
