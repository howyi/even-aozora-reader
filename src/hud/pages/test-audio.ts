import {
	type AudioEventPayload,
	RebuildPageContainer,
	type Sys_ItemEvent,
	TextContainerProperty,
	TextContainerUpgrade,
} from "@evenrealities/even_hub_sdk";
import { GLASS_SCREEN_HEIGHT, GLASS_SCREEN_WIDTH } from "@/constants";
import { BasePage } from "./base";
import { TestList } from "./test-list";

export class TestAudio extends BasePage {
	private readonly AUDIO_CONTAINER_ID = 1;
	private readonly BAR_TOTAL = 24;
	private readonly DRAW_INTERVAL_MS = 120;

	private micEnabled = false;
	private smoothedVolume = 0;
	private lastDrawAt = 0;

	render(): RebuildPageContainer {
		return new RebuildPageContainer({
			containerTotalNum: 1,
			textObject: [
				new TextContainerProperty({
					containerID: this.AUDIO_CONTAINER_ID,
					containerName: "test-audio",
					xPosition: 0,
					yPosition: 0,
					width: GLASS_SCREEN_WIDTH,
					height: GLASS_SCREEN_HEIGHT,
					borderWidth: 1,
					borderColor: 13,
					paddingLength: 5,
					isEventCapture: 1,
					content: this.composeContent(),
				}),
			],
		});
	}

	async afterRender(): Promise<void> {
		await this.setMicEnabled(true);
		await this.updateDisplay(true);
	}

	override onAudio(event: AudioEventPayload): void {
		const pcm = this.toUint8Array(event.audioPcm as unknown);
		if (pcm.length < 2) return;

		const instant = this.calculateVolumePercent(pcm);
		this.smoothedVolume = Math.round(
			this.smoothedVolume * 0.75 + instant * 0.25,
		);

		void this.updateDisplay();
	}

	override onClick(_event: Sys_ItemEvent): void {
		void this.toggleMic();
	}

	override onDoubleClick(_event: Sys_ItemEvent): void {
		void this.exitToList();
	}

	private async toggleMic() {
		await this.setMicEnabled(!this.micEnabled);
		await this.updateDisplay(true);
	}

	private async exitToList() {
		await this.setMicEnabled(false);
		await this.loadPage?.(new TestList());
	}

	private async setMicEnabled(enabled: boolean) {
		if (!this.bridge) return;

		try {
			this.micEnabled = enabled;
			await this.bridge.audioControl(enabled);
		} catch (error) {
			console.warn("Failed to toggle mic:", error);
			this.micEnabled = false;
		}
	}

	private async updateDisplay(force = false) {
		if (!this.bridge) return;

		const now = Date.now();
		if (!force && now - this.lastDrawAt < this.DRAW_INTERVAL_MS) {
			return;
		}
		this.lastDrawAt = now;

		await this.bridge.textContainerUpgrade(
			new TextContainerUpgrade({
				containerID: this.AUDIO_CONTAINER_ID,
				content: this.composeContent(),
			}),
		);
	}

	private composeContent(): string {
		const level = Math.max(0, Math.min(100, this.smoothedVolume));
		const n = Math.round((level / 100) * this.BAR_TOTAL);
		const total = this.BAR_TOTAL;
		const filled = "━".repeat(n);
		const empty = "─".repeat(total - n);
		const bar = filled + empty;

		return [
			"audio monitor",
			this.micEnabled ? "mic: ON (tap=OFF)" : "mic: OFF (tap=ON)",
			`volume: ${level}`,
			bar,
			"double tap: back",
		].join("\n");
	}

	private toUint8Array(source: unknown): Uint8Array {
		if (source instanceof Uint8Array) {
			return source;
		}

		if (Array.isArray(source)) {
			return Uint8Array.from(
				source.filter((v): v is number => typeof v === "number"),
			);
		}

		if (typeof source === "string") {
			try {
				const binary = atob(source);
				const bytes = new Uint8Array(binary.length);
				for (let i = 0; i < binary.length; i++) {
					bytes[i] = binary.charCodeAt(i);
				}
				return bytes;
			} catch (_error) {
				return new Uint8Array();
			}
		}

		return new Uint8Array();
	}

	private calculateVolumePercent(pcmBytes: Uint8Array): number {
		const sampleCount = Math.floor(pcmBytes.length / 2);
		if (sampleCount <= 0) return 0;

		let squareSum = 0;
		for (let i = 0; i < sampleCount * 2; i += 2) {
			let sample = pcmBytes[i] | (pcmBytes[i + 1] << 8);
			if (sample >= 0x8000) {
				sample -= 0x10000;
			}
			squareSum += sample * sample;
		}

		const rms = Math.sqrt(squareSum / sampleCount);
		const normalized = Math.min(1, rms / 32768);
		return Math.round(normalized * 100);
	}
}
