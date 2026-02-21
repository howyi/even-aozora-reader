import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import App from "./App.tsx";
import { PageManager } from "./hud/page-manager.ts";
import { SplashText } from "./hud/pages/splash-text.ts";
import { withTimeout } from "./utils.ts";

async function main() {
	let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
	bridge = await withTimeout(
		waitForEvenAppBridge(),
		2500,
		"waitForEvenAppBridge",
	);

	let pageManager: PageManager | undefined;

	if (bridge) {
		try {
			pageManager = new PageManager(bridge);
			await pageManager.init(new SplashText("アプリで作品を選択"));
		} catch (e) {
			console.warn("Glasses UI init failed", e);
		}
	}

	// biome-ignore lint/style/noNonNullAssertion: The root element is guaranteed to exist
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App manager={pageManager} />
		</StrictMode>,
	);
}

main().catch((e) => {
	console.error(e);
});
