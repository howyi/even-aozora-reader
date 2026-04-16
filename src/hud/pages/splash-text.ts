import {
	RebuildPageContainer,
	TextContainerProperty,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { BasePage } from "./base";

export class SplashText extends BasePage {
	// ルートページでダブルタップ時に終了ダイアログを表示
	override onDoubleClick(): void {
		this.bridge?.shutDownPageContainer?.(1);
	}
	private splashText: string;

	constructor(splashText: string) {
		super();
		this.splashText = splashText;
	}

	render(): RebuildPageContainer {
		const textContainers: TextContainerProperty[] = [
			new TextContainerProperty({
				xPosition: 0,
				yPosition: 0,
				width: GLASS_SCREEN_WIDTH,
				height: GLASS_SCREEN_HEIGHT,
				borderWidth: 0,
				borderColor: 0,
				paddingLength: 0,
				containerID: 1,
				containerName: "splash",
				content: this.splashText,
				isEventCapture: 1,
			}),
		];
		return new RebuildPageContainer({
			containerTotalNum: 1,
			textObject: textContainers,
		});
	}
}
