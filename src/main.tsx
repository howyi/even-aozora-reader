import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import App from "./App.tsx";
import { PageManager } from "./hud/page-manager.ts";
import { SplashText } from "./hud/pages/splash-text.ts";
import { TestList } from "./hud/pages/test-list.ts";
import { withTimeout } from "./utils.ts";

async function main() {
	let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
	try {
		bridge = await withTimeout(
			waitForEvenAppBridge(),
			2500,
			"waitForEvenAppBridge",
		);
	} catch (e) {
		console.warn("Bridge not available, switching to browser mode", e);
	}

	let pageManager: PageManager | undefined;

	if (bridge) {
		try {
			pageManager = new PageManager(bridge);
			await pageManager.init(new SplashText("loading"));
			await pageManager.load(new TestList());
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
