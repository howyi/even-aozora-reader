import {
	CreateStartUpPageContainer,
	type EvenAppBridge,
	OsEventTypeList,
	StartUpPageCreateResult,
	TextContainerProperty,
} from "@evenrealities/even_hub_sdk";
import { createBridgeConnector } from "./bridge-connector";
import { HUD_ERRORS } from "./errors";
import { getRawEventType, normalizeEventType } from "./even-events";
import { createLogger } from "./logger";
import type { BasePage } from "./pages/base.ts";

const log = createLogger("PageManager");
const VITE_ENV = (
	import.meta as unknown as {
		env?: { DEV?: boolean; VITE_FORCE_EVENHUB?: string };
	}
).env ?? { DEV: false, VITE_FORCE_EVENHUB: undefined };

function utf8Bytes(text: string | undefined): number {
	if (!text) return 0;
	return new TextEncoder().encode(text).length;
}

export class PageManager {
	private currentPage?: BasePage;
	private bridge: EvenAppBridge;
	private startupReady = false;
	private bridgeUnavailable = false;
	private eventListenerRegistered = false;

	private shouldUseDegradedMode(): boolean {
		const forceEvenHubInDev = VITE_ENV.VITE_FORCE_EVENHUB === "true";
		return Boolean(VITE_ENV.DEV) && !forceEvenHubInDev;
	}

	constructor(bridge: EvenAppBridge) {
		this.bridge = bridge;
	}

	private async activateDegradedMode(initialPage: BasePage): Promise<boolean> {
		this.startupReady = true;
		this.bridgeUnavailable = true;
		this.currentPage = initialPage;
		initialPage.init(this.load.bind(this), this.bridge);
		await initialPage.afterRender();
		log.warn(
			"DEV webview-only mode enabled. Set VITE_FORCE_EVENHUB=true to enable bridge APIs.",
		);
		return true;
	}

	private async ensureDeviceConnected(): Promise<boolean> {
		this.bridge.onDeviceStatusChanged((status) => {
			log.debug(`Device status: connectType=${status.connectType}`);
		});

		const connector = createBridgeConnector(this.bridge, {
			timeoutMs: 2500,
		});

		try {
			log.info("Connecting to device...");
			await connector.connect();
			log.info("Device connected");
			return true;
		} catch (error) {
			log.error("Device connection failed", error);
			return false;
		}
	}

	private registerEventRouter(): void {
		if (this.eventListenerRegistered) return;
		this.eventListenerRegistered = true;

		this.bridge.onEvenHubEvent((event) => {
			const normalizedType = normalizeEventType(getRawEventType(event));

			if (event.listEvent) {
				this.currentPage?.onListSelect(event.listEvent);
				return;
			}

			if (event.textEvent) {
				if (normalizedType === OsEventTypeList.SCROLL_TOP_EVENT) {
					this.currentPage?.onScrollUp(event.textEvent);
					return;
				}
				if (normalizedType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
					this.currentPage?.onScrollDown(event.textEvent);
				}
				return;
			}

			if (event.sysEvent) {
				if (
					normalizedType === OsEventTypeList.CLICK_EVENT ||
					normalizedType === undefined
				) {
					this.currentPage?.onClick(event.sysEvent);
					return;
				}
				if (normalizedType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
					this.currentPage?.onDoubleClick(event.sysEvent);
				}
				return;
			}

			if (event.audioEvent) {
				this.currentPage?.onAudio(event.audioEvent);
			}
		});
	}

	private buildStartupContainer() {
		return new CreateStartUpPageContainer({
			containerTotalNum: 1,
			textObject: [
				new TextContainerProperty({
					containerID: 1,
					containerName: "boot",
					xPosition: 0,
					yPosition: 0,
					width: 576,
					height: 288,
					borderWidth: 0,
					borderColor: 0,
					paddingLength: 0,
					isEventCapture: 1,
					content: "loading",
				}),
			],
		});
	}

	private async setupStartupContainer(): Promise<boolean> {
		const startupContainer = this.buildStartupContainer();
		const result =
			await this.bridge.createStartUpPageContainer(startupContainer);

		const resultNames: Record<number, string> = {
			0: "success",
			1: "invalid",
			2: "oversize",
			3: "outOfMemory",
		};
		const resultName = resultNames[result as number] ?? `unknown(${result})`;
		log.info(`createStartUpPageContainer result: ${resultName}`);

		if (result === StartUpPageCreateResult.success) {
			return true;
		}

		if (result === StartUpPageCreateResult.invalid && VITE_ENV.DEV) {
			this.bridgeUnavailable = true;
			this.startupReady = true;
			log.warn("Startup invalid in DEV. Continue as degraded mode.");
			return true;
		}

		log.warn("Startup container creation failed.");
		return false;
	}

	async init(initialPage: BasePage): Promise<boolean> {
		this.startupReady = false;
		this.bridgeUnavailable = false;

		if (this.shouldUseDegradedMode()) {
			return this.activateDegradedMode(initialPage);
		}

		if (!(await this.ensureDeviceConnected())) {
			return false;
		}

		this.registerEventRouter();

		const startupReady = await this.setupStartupContainer();
		if (!startupReady) {
			if (VITE_ENV.DEV) {
				return this.activateDegradedMode(initialPage);
			}
			return false;
		}

		this.startupReady = true;
		this.bridgeUnavailable = false;
		await this.load(initialPage);
		return true;
	}

	async load(page: BasePage) {
		if (!this.startupReady) {
			throw new Error(HUD_ERRORS.NOT_INITIALIZED);
		}
		if (this.bridgeUnavailable) {
			this.currentPage = page;
			page.init(this.load.bind(this), this.bridge);
			await page.afterRender();
			return;
		}
		this.currentPage = page;
		page.init(this.load.bind(this), this.bridge);
		const rendered = page.render();
		log.debug(
			`load() payload summary: total=${String(rendered.containerTotalNum)} textCount=${String(rendered.textObject?.length ?? 0)} imageCount=${String(rendered.imageObject?.length ?? 0)} listCount=${String(rendered.listObject?.length ?? 0)}`,
		);
		for (const textObj of rendered.textObject ?? []) {
			log.debug(
				`text container id=${String(textObj.containerID)} name=${String(textObj.containerName)} nameLen=${String((textObj.containerName ?? "").length)} chars=${String((textObj.content ?? "").length)} bytes=${String(utf8Bytes(textObj.content))}`,
			);
		}
		const rebuilt = await this.bridge.rebuildPageContainer(rendered);
		if (!rebuilt) {
			log.error("rebuildPageContainer returned false");

			if (VITE_ENV.DEV) {
				this.bridgeUnavailable = true;
				log.warn(
					"rebuild unavailable in DEV. Switched to degraded mode (webview only).",
				);
				await page.afterRender();
				return;
			}
			throw new Error(HUD_ERRORS.REBUILD_FAILED);
		}
		await page?.afterRender();
	}
}
