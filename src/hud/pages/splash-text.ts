import {
	RebuildPageContainer,
	TextContainerProperty,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { BasePage } from "./base";

export class SplashText extends BasePage {
	private splashText: string;

	constructor(splashText: string) {
		super();
		this.splashText = splashText;
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
					containerName: `${this.defaultContainerName}-item-${idx + 1}`,
					content: idx === 1 ? this.splashText : "",
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
