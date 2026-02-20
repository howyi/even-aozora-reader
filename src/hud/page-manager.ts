import {
	CreateStartUpPageContainer,
	DeviceConnectType,
	type EvenAppBridge,
	OsEventTypeList,
} from "@evenrealities/even_hub_sdk";
import type { BasePage } from "./pages/base.ts";

export class PageManager {
	private currentPage?: BasePage;
	private bridge: EvenAppBridge;

	constructor(bridge: EvenAppBridge) {
		this.bridge = bridge;
	}

	async init(initialPage: BasePage) {
		this.bridge.onDeviceStatusChanged((status) => {
			console.log("📱 Device status changed:", status);
			if (status.connectType === DeviceConnectType.Connected) {
				console.log("Device connected", status.sn);
			}
		});
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
		await this.bridge.createStartUpPageContainer(
			new CreateStartUpPageContainer({
				...rendered,
			}),
		);
		await initialPage?.afterRender();
	}

	async load(page: BasePage) {
		this.currentPage = page;
		page.init(this.load.bind(this), this.bridge);
		const rendered = page.render();
		await this.bridge.rebuildPageContainer(rendered);
		await page?.afterRender();
	}
}
