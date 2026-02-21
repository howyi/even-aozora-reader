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

	onScrollUp(_event: Text_ItemEvent): void {}

	onScrollDown(_event: Text_ItemEvent): void {}

	onClick(_event: Sys_ItemEvent): void {}

	onDoubleClick(_event: Sys_ItemEvent): void {}

	onListSelect(_event: List_ItemEvent): void {}

	onAudio(event: AudioEventPayload): void {}

	abstract render(): RebuildPageContainer;

	async afterRender(): Promise<void> {}
}
