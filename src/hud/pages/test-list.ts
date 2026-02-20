import type { List_ItemEvent } from "@evenrealities/even_hub_sdk";
import {
	ListContainerProperty,
	ListItemContainerProperty,
	RebuildPageContainer,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { BasePage } from "./base";
import { SplashText } from "./splash-text";
import { TestAudio } from "./test-audio";
import { TestImage } from "./test-image";
import { TestLayout } from "./test-layout";
import { TestText } from "./test-text";

export class TestList extends BasePage {
	private items: { name: string; onClick: () => void }[] = [];

	onListSelect(event: List_ItemEvent): void {
		const selectedIndex = event.currentSelectItemIndex ?? 0;
		this.items[selectedIndex]?.onClick();
	}

	render(): RebuildPageContainer {
		this.items = [
			{
				name: "test1",
				onClick: () => {
					console.log("Item clicked:", "test1");
				},
			},
			{
				name: "splash-text",
				onClick: () => {
					this.loadPage?.(new SplashText("loading"));
				},
			},
			{
				name: "test-text",
				onClick: () => {
					this.loadPage?.(new TestText());
				},
			},
			{
				name: "test-image",
				onClick: () => {
					this.loadPage?.(new TestImage());
				},
			},
			{
				name: "test-layout",
				onClick: () => {
					this.loadPage?.(new TestLayout());
				},
			},
			{
				name: "test-audio",
				onClick: () => {
					this.loadPage?.(new TestAudio());
				},
			},
			{
				name: "test6",
				onClick: () => {
					console.log("Item clicked:", "test6");
				},
			},
			{
				name: "test7",
				onClick: () => {
					console.log("Item clicked:", "test7");
				},
			},
			{
				name: "test8    ",
				onClick: () => {
					console.log("Item clicked:", "test8");
				},
			},
			{
				name: "test9",
				onClick: () => {
					console.log("Item clicked:", "test9");
				},
			},
		];
		return new RebuildPageContainer({
			containerTotalNum: 1,
			listObject: [
				new ListContainerProperty({
					containerID: this.defaultContainerId,
					containerName: this.defaultContainerName,
					xPosition: 0,
					yPosition: 0,
					width: GLASS_SCREEN_WIDTH,
					height: GLASS_SCREEN_HEIGHT,
					borderWidth: 1,
					borderColor: 13,
					borderRdaius: 6,
					paddingLength: 5,
					isEventCapture: 1,
					itemContainer: new ListItemContainerProperty({
						itemCount: 1,
						// itemWidth: 560,
						itemWidth: GLASS_SCREEN_WIDTH - 14, // (borderWidth + paddingLength + item border) * 2
						isItemSelectBorderEn: 1,
						itemName: this.items.map((item) => item.name),
					}),
				}),
			],
		});
	}
}
