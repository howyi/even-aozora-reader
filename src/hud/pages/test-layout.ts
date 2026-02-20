import {
	ImageContainerProperty,
	ImageRawDataUpdate,
	RebuildPageContainer,
	type Sys_ItemEvent,
	TextContainerProperty,
	TextContainerUpgrade,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { BasePage } from "./base";
import { TestList } from "./test-list";

export class TestLayout extends BasePage {
	private readonly IMAGE_URL = "https://sbox.studio/images/transparent.png";
	private readonly COLUMN_GAP = 4;

	private readonly IMAGE_CONTAINER_ID = 101;
	private readonly LEFT_CHAT_CONTAINER_ID = 102;
	private readonly RIGHT_CHAT_CONTAINER_ID = 103;

	private readonly leftWidth = Math.floor(
		(GLASS_SCREEN_WIDTH - this.COLUMN_GAP) / 2,
	);
	private readonly rightWidth =
		GLASS_SCREEN_WIDTH - this.leftWidth - this.COLUMN_GAP;
	private readonly rightX = this.leftWidth + this.COLUMN_GAP;
	private readonly leftTopHeight = Math.floor(GLASS_SCREEN_HEIGHT / 4);
	private readonly leftBottomHeight = GLASS_SCREEN_HEIGHT - this.leftTopHeight;

	private timerId?: number;
	private tick = 0;
	private leftLines: string[] = [];
	private rightLines: string[] = [];
	private activeCapture: "left" | "right" = "left";

	render(): RebuildPageContainer {
		const leftIsCapture = this.activeCapture === "left";
		const rightIsCapture = this.activeCapture === "right";

		return new RebuildPageContainer({
			containerTotalNum: 3,
			imageObject: [
				new ImageContainerProperty({
					containerID: this.IMAGE_CONTAINER_ID,
					containerName: "layout-image-top-left",
					xPosition: 0,
					yPosition: 0,
					width: this.leftWidth,
					height: this.leftTopHeight,
				}),
			],
			textObject: [
				new TextContainerProperty({
					containerID: this.LEFT_CHAT_CONTAINER_ID,
					containerName: "layout-chat-left-bottom",
					xPosition: 0,
					yPosition: this.leftTopHeight,
					width: this.leftWidth,
					height: this.leftBottomHeight,
					borderWidth: 0,
					borderColor: 0,
					paddingLength: 4,
					isEventCapture: leftIsCapture ? 1 : 0,
					content:
						this.leftLines.length > 0
							? this.leftLines.join("\n")
							: "左チャット: 初期化中…",
				}),
				new TextContainerProperty({
					containerID: this.RIGHT_CHAT_CONTAINER_ID,
					containerName: "layout-chat-right",
					xPosition: this.rightX,
					yPosition: 0,
					width: this.rightWidth,
					height: GLASS_SCREEN_HEIGHT,
					borderWidth: 0,
					borderColor: 0,
					paddingLength: 4,
					isEventCapture: rightIsCapture ? 1 : 0,
					content:
						this.rightLines.length > 0
							? this.rightLines.join("\n")
							: "右チャット: 初期化中…",
				}),
			],
		});
	}

	async afterRender(): Promise<void> {
		await this.sendTopLeftImage();
		this.startFakeChatFeed();
	}

	onDoubleClick(_event: Sys_ItemEvent): void {
		this.stopFakeChatFeed();
		this.loadPage?.(new TestList());
	}

	override onClick(_event: Sys_ItemEvent): void {
		void this.toggleCaptureTarget();
	}

	private async toggleCaptureTarget() {
		if (!this.bridge) return;

		this.activeCapture = this.activeCapture === "left" ? "right" : "left";
		await this.bridge.rebuildPageContainer(this.render());
		await this.sendTopLeftImage();
		await this.updateChatContainers();

		console.log("Switched isEventCapture target:", this.activeCapture);
	}

	private startFakeChatFeed() {
		this.stopFakeChatFeed();
		this.pushNextMessages();
		this.timerId = window.setInterval(() => {
			this.pushNextMessages();
		}, 1200);
	}

	private stopFakeChatFeed() {
		if (this.timerId != null) {
			window.clearInterval(this.timerId);
			this.timerId = undefined;
		}
	}

	private pushNextMessages() {
		this.tick += 1;
		const t = new Date();
		const time = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`;

		const leftSamples = [
			"新着コメントを受信しました",
			"音声認識の結果を整形中です",
			"会話ログをバッファに追加しました",
			"ユーザーの発話を要約しています",
			"イベントストリーム接続は正常です",
		];
		const rightSamples = [
			"テスト用の日本語テキストを追記します",
			"右ペインは長文表示の確認領域です",
			"スクロール挙動の検証を想定しています",
			"最終的にはリアルタイムイベントに置換します",
			"UIレイアウトのバランスを確認中です",
		];

		const leftMsg = `[${time}] ${leftSamples[this.tick % leftSamples.length]}`;
		const rightMsg = `[${time}] ${rightSamples[this.tick % rightSamples.length]} (#${this.tick})`;

		this.leftLines.unshift(leftMsg);
		this.rightLines.unshift(rightMsg);

		this.leftLines = this.leftLines.slice(0, 5);
		this.rightLines = this.rightLines.slice(0, 12);

		void this.updateChatContainers();
	}

	private async updateChatContainers() {
		if (!this.bridge) return;
		await this.bridge.textContainerUpgrade(
			new TextContainerUpgrade({
				containerID: this.LEFT_CHAT_CONTAINER_ID,
				content: this.leftLines.join("\n"),
			}),
		);
		await this.bridge.textContainerUpgrade(
			new TextContainerUpgrade({
				containerID: this.RIGHT_CHAT_CONTAINER_ID,
				content: this.rightLines.join("\n"),
			}),
		);
	}

	private async sendTopLeftImage() {
		if (!this.bridge) return;
		const imageData = await this.fetchAndResizePngToContainer(
			this.IMAGE_URL,
			this.leftWidth,
			this.leftTopHeight,
		);
		await this.bridge.updateImageRawData(
			new ImageRawDataUpdate({
				containerID: this.IMAGE_CONTAINER_ID,
				containerName: "layout-image-top-left",
				imageData,
			}),
		);
	}

	private async fetchAndResizePngToContainer(
		url: string,
		targetWidth: number,
		targetHeight: number,
	): Promise<number[]> {
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
			if (!ctx) throw new Error("Failed to get 2D canvas context");
			ctx.clearRect(0, 0, targetWidth, targetHeight);
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
