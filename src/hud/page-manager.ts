import {
	CreateStartUpPageContainer,
	type EvenAppBridge,
	OsEventTypeList,
	RebuildPageContainer,
	StartUpPageCreateResult,
	TextContainerProperty,
} from "@evenrealities/even_hub_sdk";
import { createBridgeConnector } from "./bridge-connector";
import type { BasePage } from "./pages/base.ts";

function pmDebug(message: string, level: "info" | "warn" | "error" = "info") {
	console[level](`[PageManager] ${message}`);
}

function utf8Bytes(text: string | undefined): number {
	if (!text) return 0;
	return new TextEncoder().encode(text).length;
}

function resolveWidgetIdFromWindow(): number | undefined {
	const raw = Reflect.get(window as unknown as object, "__EVEN_HUB_APP_ID__");
	if (typeof raw === "number" && Number.isFinite(raw)) return raw;
	if (typeof raw === "string") {
		const parsed = Number(raw);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

export class PageManager {
	private currentPage?: BasePage;
	private bridge: EvenAppBridge;
	private startupReady = false;
	private bridgeUnavailable = false;

	private shouldUseDegradedMode(): boolean {
		const forceEvenHubInDev = import.meta.env.VITE_FORCE_EVENHUB === "true";
		return import.meta.env.DEV && !forceEvenHubInDev;
	}

	constructor(bridge: EvenAppBridge) {
		this.bridge = bridge;
	}

	async init(initialPage: BasePage): Promise<boolean> {
		this.startupReady = false;
		this.bridgeUnavailable = false;

		if (this.shouldUseDegradedMode()) {
			this.startupReady = true;
			this.bridgeUnavailable = true;
			this.currentPage = initialPage;
			initialPage.init(this.load.bind(this), this.bridge);
			await initialPage.afterRender();
			pmDebug(
				"DEV webview-only mode enabled. Set VITE_FORCE_EVENHUB=true to enable bridge APIs.",
				"warn",
			);
			return true;
		}

		// 接続管理を統一するため bridge connector を使う
		this.bridge.onDeviceStatusChanged((status) => {
			pmDebug(`Device status: connectType=${status.connectType}`);
		});

		const connector = createBridgeConnector(this.bridge, {
			timeoutMs: 4500,
		});

		try {
			pmDebug("Connecting to device...");
			await connector.connect();
			pmDebug("Device connected");
		} catch (e) {
			pmDebug(`Device connection failed: ${String(e)}`, "error");
			return false;
		}

		this.bridge.onEvenHubEvent((event) => {
			console.log("🎯 Bridge received event (before onEvenHubEvent):", event);
			if (event.listEvent) {
				this.currentPage?.onListSelect(event.listEvent);
			} else if (event.textEvent) {
				const eventType = event.textEvent.eventType;
				if (eventType === OsEventTypeList.SCROLL_TOP_EVENT) {
					this.currentPage?.onScrollUp(event.textEvent);
				} else if (eventType === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
					this.currentPage?.onScrollDown(event.textEvent);
				}
			} else if (event.sysEvent) {
				const eventType = event.sysEvent.eventType;
				if (
					eventType === OsEventTypeList.CLICK_EVENT ||
					eventType === undefined
				) {
					this.currentPage?.onClick(event.sysEvent);
				} else if (eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
					this.currentPage?.onDoubleClick(event.sysEvent);
				}
			} else if (event.audioEvent) {
				this.currentPage?.onAudio(event.audioEvent);
			}
		});

		const explicitWidgetId = resolveWidgetIdFromWindow();
		const rawAppId = Reflect.get(
			window as unknown as object,
			"__EVEN_HUB_APP_ID__",
		);
		pmDebug(
			`window.__EVEN_HUB_APP_ID__: ${String(rawAppId)} (resolved=${String(explicitWidgetId)})`,
		);

		const startupContainer = new CreateStartUpPageContainer({
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
		pmDebug(
			`startup container toJson: ${JSON.stringify(CreateStartUpPageContainer.toJson(startupContainer))}`,
		);

		let result = await this.bridge.createStartUpPageContainer(startupContainer);
		if (
			result === StartUpPageCreateResult.invalid &&
			explicitWidgetId !== undefined
		) {
			const startupPayload = {
				...CreateStartUpPageContainer.toJson(startupContainer),
				widgetId: explicitWidgetId,
			};
			const startupRaw = await this.bridge.callEvenApp(
				"createStartUpPageContainer",
				startupPayload,
			);
			const startupRawNumber = Number(startupRaw);
			if (Number.isFinite(startupRawNumber)) {
				result = StartUpPageCreateResult.fromInt(startupRawNumber);
			}
			pmDebug(
				`startup raw result: ${String(startupRaw)} normalized: ${String(result)}`,
				result === StartUpPageCreateResult.success ? "warn" : "error",
			);
		}
		const resultNames: Record<number, string> = {
			0: "success",
			1: "invalid",
			2: "oversize",
			3: "outOfMemory",
		};
		const resultName = resultNames[result as number] ?? `unknown(${result})`;
		pmDebug(
			`createStartUpPageContainer result: ${result} (${resultName})`,
			result === StartUpPageCreateResult.success ? "info" : "error",
		);

		if (result === StartUpPageCreateResult.invalid && import.meta.env.DEV) {
			this.startupReady = true;
			this.bridgeUnavailable = true;
			pmDebug(
				"startup invalid in DEV. Entering degraded mode (webview only).",
				"warn",
			);
			return true;
		}

		if (result === StartUpPageCreateResult.invalid) {
			pmDebug(
				"startup invalid detected; trying rebuild fallback for existing session",
				"warn",
			);
			try {
				this.startupReady = true;
				await this.load(initialPage);
				pmDebug("rebuild fallback succeeded", "warn");
				return true;
			} catch (e) {
				this.startupReady = false;
				pmDebug(`rebuild fallback failed: ${String(e)}`, "error");
				if (import.meta.env.DEV) {
					// エミュレータ/開発ブラウザでは、bridge があっても EvenHub API が使えない場合がある。
					this.startupReady = true;
					this.bridgeUnavailable = true;
					pmDebug(
						"EvenHub unavailable in DEV. Entering degraded mode (webview only).",
						"warn",
					);
					return true;
				}
				return false;
			}
		}

		if (result === StartUpPageCreateResult.success) {
			this.startupReady = true;
			this.bridgeUnavailable = false;
			await this.load(initialPage);
		}
		return result === StartUpPageCreateResult.success;
	}

	async load(page: BasePage) {
		if (!this.startupReady) {
			throw new Error(
				"グラスの表示コンテナ初期化に失敗しています。接続状態を確認して再度お試しください。",
			);
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
		pmDebug(
			`load() payload summary: total=${String(rendered.containerTotalNum)} textCount=${String(rendered.textObject?.length ?? 0)} imageCount=${String(rendered.imageObject?.length ?? 0)} listCount=${String(rendered.listObject?.length ?? 0)}`,
		);
		for (const textObj of rendered.textObject ?? []) {
			pmDebug(
				`text container id=${String(textObj.containerID)} name=${String(textObj.containerName)} nameLen=${String((textObj.containerName ?? "").length)} chars=${String((textObj.content ?? "").length)} bytes=${String(utf8Bytes(textObj.content))}`,
			);
		}
		const rebuilt = await this.bridge.rebuildPageContainer(rendered);
		if (!rebuilt) {
			pmDebug("rebuildPageContainer returned false", "error");
			pmDebug(`rebuild payload json: ${JSON.stringify(rendered)}`, "error");

			const rawRetry = await this.bridge.callEvenApp(
				"rebuildPageContainer",
				RebuildPageContainer.toJson(rendered),
			);
			pmDebug(
				`raw callEvenApp(rebuildPageContainer) result: ${String(rawRetry)}`,
				"error",
			);

			if (import.meta.env.DEV && rawRetry === false) {
				this.bridgeUnavailable = true;
				pmDebug(
					"rebuild unavailable in DEV. Switched to degraded mode (webview only).",
					"warn",
				);
				await page.afterRender();
				return;
			}

			const textDiagnostics = (rendered.textObject ?? [])
				.map(
					(t) =>
						`id=${String(t.containerID)} name=${String(t.containerName)} nameLen=${String((t.containerName ?? "").length)} chars=${String((t.content ?? "").length)} bytes=${String(utf8Bytes(t.content))}`,
				)
				.join(" | ");
			throw new Error(
				`グラス側ページ更新に失敗しました。raw=${String(rawRetry)} / text=[${textDiagnostics}]`,
			);
		}
		await page?.afterRender();
	}
}
