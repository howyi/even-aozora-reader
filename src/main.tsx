import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import App from "./App.tsx";
import { PageManager } from "./hud/page-manager.ts";
import { SplashText } from "./hud/pages/splash-text.ts";
import { withTimeout } from "./utils.ts";

const INIT_RETRY_DELAY_MS = 400;

const sleep = (ms: number) =>
	new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms);
	});

async function initPageManagerWithRetry(
	bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>>,
	maxAttempts = 2,
) {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const manager = new PageManager(bridge);
			await manager.init(new SplashText("アプリで作品を選択"));
			return manager;
		} catch (e) {
			const isLastAttempt = attempt === maxAttempts;
			console.warn(
				`Glasses UI init failed (attempt ${attempt}/${maxAttempts})`,
				e,
			);
			if (!isLastAttempt) {
				await sleep(INIT_RETRY_DELAY_MS);
			}
		}
	}

	return undefined;
}

async function main() {
	let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
	try {
		bridge = await withTimeout(
			waitForEvenAppBridge(),
			2500,
			"waitForEvenAppBridge",
		);
	} catch (e) {
		console.error("waitForEvenAppBridge error", e);
	}

	let pageManager: PageManager | undefined;

	if (bridge) {
		pageManager = await initPageManagerWithRetry(bridge, 2);
	}

	const reinitializePageManager = async () => {
		if (!bridge) return undefined;
		pageManager = await initPageManagerWithRetry(bridge, 2);
		return pageManager;
	};

	// biome-ignore lint/style/noNonNullAssertion: The root element is guaranteed to exist
	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App
				manager={pageManager}
				reinitializeManager={reinitializePageManager}
			/>
		</StrictMode>,
	);
}

main().catch((e) => {
	console.error(e);
});
