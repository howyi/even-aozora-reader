import {
	CreateStartUpPageContainer,
	DeviceConnectType,
	type EvenAppBridge,
	OsEventTypeList,
	RebuildPageContainer,
	StartUpPageCreateResult,
	TextContainerProperty,
} from "@evenrealities/even_hub_sdk";
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

async function waitForConnected(
	bridge: EvenAppBridge,
	timeoutMs = 4000,
): Promise<boolean> {
	try {
		const info = await bridge.getDeviceInfo();
		const initialType = info?.status?.connectType;
		pmDebug(`getDeviceInfo connectType: ${String(initialType)}`);
		if (initialType === DeviceConnectType.Connected) {
			return true;
		}
	} catch (e) {
		pmDebug(`getDeviceInfo error: ${String(e)}`, "warn");
	}

	return await new Promise<boolean>((resolve) => {
		const timer = window.setTimeout(() => {
			unsubscribe();
			resolve(false);
		}, timeoutMs);

		const unsubscribe = bridge.onDeviceStatusChanged((status) => {
			if (status.connectType === DeviceConnectType.Connected) {
				window.clearTimeout(timer);
				unsubscribe();
				resolve(true);
			}
		});
	});
}

export class PageManager {
	private currentPage?: BasePage;
	private bridge: EvenAppBridge;
	private startupReady = false;

	constructor(bridge: EvenAppBridge) {
		this.bridge = bridge;
	}

	async init(initialPage: BasePage): Promise<boolean> {
		this.startupReady = false;
		this.bridge.onDeviceStatusChanged((status) => {
			pmDebug(`onDeviceStatusChanged: connectType=${status.connectType} sn=${status.sn}`);
			if (status.connectType === DeviceConnectType.Connected) {
				pmDebug(`Device connected: ${status.sn}`);
			}
		});
		pmDebug("waiting for connected device before startup page...");
		const connected = await waitForConnected(this.bridge, 4500);
		pmDebug(`device connected before startup page: ${connected}`);
		if (!connected) {
			pmDebug(
				"skip createStartUpPageContainer: device is not connected (connectType=none)",
				"warn",
			);
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
		this.currentPage = initialPage;
		initialPage.init(this.load.bind(this), this.bridge);
		const rendered = initialPage.render();

		// rendered の own keys を確認（spread が効かない場合を検出）
		pmDebug(`rendered own keys: ${JSON.stringify(Object.keys(rendered))}`);
		pmDebug(`rendered JSON: ${JSON.stringify(rendered)}`);

		// window 上の Even App 系プロパティを確認（widgetId の有無など）
		const evenWindowKeys = Object.keys(window).filter(
			(k) =>
				k.toLowerCase().includes("even") ||
				k.toLowerCase().includes("widget") ||
				k.toLowerCase().includes("eh_"),
		);
		pmDebug(`window even* keys: ${JSON.stringify(evenWindowKeys)}`);

		const container = new CreateStartUpPageContainer({
			containerTotalNum: rendered.containerTotalNum,
			listObject: rendered.listObject,
			textObject: rendered.textObject,
			imageObject: rendered.imageObject,
		});
		const explicitWidgetId = resolveWidgetIdFromWindow();
		const rawAppId = Reflect.get(window as unknown as object, "__EVEN_HUB_APP_ID__");
		pmDebug(
			`window.__EVEN_HUB_APP_ID__: ${String(rawAppId)} (resolved=${String(explicitWidgetId)})`,
		);
		pmDebug(`container toJson: ${JSON.stringify(CreateStartUpPageContainer.toJson(container))}`);

		let result = await this.bridge.createStartUpPageContainer(container);

		if (
			result === StartUpPageCreateResult.invalid &&
			explicitWidgetId !== undefined
		) {
			pmDebug("retry createStartUpPageContainer with explicit widgetId", "warn");
			const retryPayload = {
				...CreateStartUpPageContainer.toJson(container),
				widgetId: explicitWidgetId,
			};
			pmDebug(`retry payload: ${JSON.stringify(retryPayload)}`, "warn");
			const retryRaw = await this.bridge.callEvenApp(
				"createStartUpPageContainer",
				retryPayload,
			);
			const retryNumber = Number(retryRaw);
			if (Number.isFinite(retryNumber)) {
				result = StartUpPageCreateResult.fromInt(retryNumber);
				pmDebug(
					`retry result(raw): ${String(retryRaw)} normalized: ${result}`,
					retryNumber === StartUpPageCreateResult.success ? "info" : "error",
				);
			} else {
				pmDebug(`retry result is not numeric: ${String(retryRaw)}`, "error");
			}
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
		if (result === StartUpPageCreateResult.success) {
			this.startupReady = true;
			await initialPage?.afterRender();
		}
		return result === StartUpPageCreateResult.success;
	}

	async load(page: BasePage) {
		if (!this.startupReady) {
			throw new Error(
				"グラスの表示コンテナ初期化に失敗しています。接続状態を確認して再度お試しください。",
			);
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
			pmDebug(`raw callEvenApp(rebuildPageContainer) result: ${String(rawRetry)}`, "error");

			const minimal = new RebuildPageContainer({
				containerTotalNum: 1,
				textObject: [
					new TextContainerProperty({
						containerID: 1,
						containerName: "diag",
						xPosition: 0,
						yPosition: 0,
						width: 576,
						height: 288,
						borderWidth: 0,
						borderColor: 0,
						paddingLength: 0,
						isEventCapture: 1,
						content: "diagnostic",
					}),
				],
			});
			const minimalResult = await this.bridge.rebuildPageContainer(minimal);
			pmDebug(
				`minimal rebuild result: ${String(minimalResult)} payload=${JSON.stringify(minimal)}`,
				minimalResult ? "warn" : "error",
			);

			const textDiagnostics = (rendered.textObject ?? [])
				.map(
					(t) =>
						`id=${String(t.containerID)} name=${String(t.containerName)} nameLen=${String((t.containerName ?? "").length)} chars=${String((t.content ?? "").length)} bytes=${String(utf8Bytes(t.content))}`,
				)
				.join(" | ");

			const diagnosis = minimalResult
				? "minimal=ok: 本文ペイロード要因の可能性が高い"
				: "minimal=ng: セッション/ホスト状態要因の可能性が高い";
			throw new Error(
				`グラス側ページ更新に失敗しました。${diagnosis} / raw=${String(rawRetry)} / text=[${textDiagnostics}]`,
			);
		}
		await page?.afterRender();
	}
}
