import type {
	AudioEventPayload,
	EvenAppBridge,
	List_ItemEvent,
	RebuildPageContainer,
	Sys_ItemEvent,
	Text_ItemEvent,
} from "@evenrealities/even_hub_sdk";

type PageLoadFunction = (page: BasePage) => Promise<void>;

export abstract class BasePage {
	protected loadPage?: PageLoadFunction;
	protected bridge?: EvenAppBridge;
	protected defaultContainerId = 1;
	protected defaultContainerName = "default-container";

	init(loadPage: PageLoadFunction, bridge: EvenAppBridge) {
		this.loadPage = loadPage;
		this.bridge = bridge;
	}

	onScrollUp(_event: Text_ItemEvent): void {
		console.log("Scroll up event triggered");
	}

	onScrollDown(_event: Text_ItemEvent): void {
		console.log("Scroll down event triggered");
	}

	onClick(_event: Sys_ItemEvent): void {
		console.log("Click event triggered");
	}

	onDoubleClick(_event: Sys_ItemEvent): void {
		console.log("Double click event triggered");
	}

	onListSelect(_event: List_ItemEvent): void {
		console.log("List select event triggered");
	}

	onAudio(event: AudioEventPayload): void {
		console.log("Audio event triggered", event.audioPcm?.length ?? 0);
	}

	abstract render(): RebuildPageContainer;

	async afterRender(): Promise<void> {}
}
