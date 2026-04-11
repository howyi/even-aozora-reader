import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import { STARTUP_SPLASH_TEXT } from "@/constants";
import { withTimeout } from "@/utils";
import { createLogger } from "./logger";
import { PageManager } from "./page-manager";
import { SplashText } from "./pages/splash-text";

const log = createLogger("AppRuntime");
const MAX_INIT_ATTEMPTS = 2;
const BRIDGE_TIMEOUT_MS = 1800;

export function createAppRuntime() {
	let bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>> | null = null;
	let manager: PageManager | undefined;
	let initInFlight: Promise<PageManager | undefined> | null = null;

	const ensureBridge = async () => {
		if (bridge) return bridge;
		bridge = await withTimeout(
			waitForEvenAppBridge(),
			BRIDGE_TIMEOUT_MS,
			"waitForEvenAppBridge",
		);
		log.info("Bridge connected");
		return bridge;
	};

	const initPageManagerWithRetry = async (
		targetBridge: Awaited<ReturnType<typeof waitForEvenAppBridge>>,
	) => {
		for (let attempt = 1; attempt <= MAX_INIT_ATTEMPTS; attempt++) {
			try {
				const candidate = new PageManager(targetBridge);
				const ok = await candidate.init(new SplashText(STARTUP_SPLASH_TEXT));
				if (!ok) throw new Error("PageManager.init returned false");
				log.info(`PageManager initialized (attempt ${attempt})`);
				return candidate;
			} catch (error) {
				log.warn(`PageManager init failed (attempt ${attempt})`, error);
			}
		}
		return undefined;
	};

	const initializeInBackground = async () => {
		if (initInFlight) return initInFlight;

		initInFlight = (async () => {
			try {
				const activeBridge = await ensureBridge();
				manager = await initPageManagerWithRetry(activeBridge);
				return manager;
			} catch (error) {
				log.error("Background initialization failed", error);
				return undefined;
			}
		})();

		try {
			return await initInFlight;
		} finally {
			initInFlight = null;
		}
	};

	const reinitialize = async () => {
		log.info("Reinitialization requested");
		return initializeInBackground();
	};

	return {
		initializeInBackground,
		reinitialize,
		getManager: () => manager,
	};
}
