import {
	ImageContainerProperty,
	ImageRawDataUpdate,
	RebuildPageContainer,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { BasePage } from "./base";

export class TestImage extends BasePage {
	private readonly IMAGE_URL = "https://sbox.studio/images/transparent.png";
	private readonly IMAGE_WIDTH = Math.min(
		100,
		GLASS_SCREEN_WIDTH,
		GLASS_SCREEN_HEIGHT,
	);
	private readonly IMAGE_HEIGHT = Math.min(
		100,
		GLASS_SCREEN_WIDTH,
		GLASS_SCREEN_HEIGHT,
	);

	render(): RebuildPageContainer {
		const xPosition = Math.floor((GLASS_SCREEN_WIDTH - this.IMAGE_WIDTH) / 2);
		const yPosition = Math.floor((GLASS_SCREEN_HEIGHT - this.IMAGE_HEIGHT) / 2);

		return new RebuildPageContainer({
			containerTotalNum: 1,
			imageObject: [
				new ImageContainerProperty({
					containerID: this.defaultContainerId,
					containerName: this.defaultContainerName,
					xPosition,
					yPosition,
					width: this.IMAGE_WIDTH,
					height: this.IMAGE_HEIGHT,
				}),
			],
		});
	}

	async afterRender(): Promise<void> {
		await this.sendTestImage();
	}

	/**
	 * URLから透過PNGを取得して送信する
	 */
	private async sendTestImage() {
		if (!this.bridge) return;

		const imageData = await this.fetchAndResizePngToContainer(
			this.IMAGE_URL,
			this.IMAGE_WIDTH,
			this.IMAGE_HEIGHT,
		);

		console.log("Sending image data...", {
			length: imageData.length,
			containerID: this.defaultContainerId,
		});

		const result = await this.bridge.updateImageRawData(
			new ImageRawDataUpdate({
				containerID: this.defaultContainerId,
				containerName: this.defaultContainerName,
				imageData,
			}),
		);

		console.log("Image update result:", result);
	}

	/**
	 * PNGを取得し、コンテナサイズに中央フィットでリサイズしたPNG bytes(number[])を返す
	 */
	private async fetchAndResizePngToContainer(
		url: string,
		targetWidth: number,
		targetHeight: number,
	): Promise<number[]> {
		console.log("Fetching image...", url);
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch image: ${response.status} ${response.statusText}`,
			);
		}

		const blob = await response.blob();
		const bitmap = await createImageBitmap(blob);

		try {
			const canvas = document.createElement("canvas");
			canvas.width = targetWidth;
			canvas.height = targetHeight;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Failed to get 2D canvas context");
			}

			// 透過背景を維持
			ctx.clearRect(0, 0, targetWidth, targetHeight);

			// 元画像を中央フィット（アスペクト比維持）
			const scale = Math.min(
				targetWidth / bitmap.width,
				targetHeight / bitmap.height,
			);
			const drawWidth = Math.max(1, Math.floor(bitmap.width * scale));
			const drawHeight = Math.max(1, Math.floor(bitmap.height * scale));
			const dx = Math.floor((targetWidth - drawWidth) / 2);
			const dy = Math.floor((targetHeight - drawHeight) / 2);

			ctx.drawImage(bitmap, dx, dy, drawWidth, drawHeight);

			const resizedBlob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob((result) => {
					if (!result) {
						reject(new Error("Failed to serialize resized PNG"));
						return;
					}
					resolve(result);
				}, "image/png");
			});

			const resizedBuffer = await resizedBlob.arrayBuffer();
			return Array.from(new Uint8Array(resizedBuffer));
		} finally {
			bitmap.close();
		}
	}
}
