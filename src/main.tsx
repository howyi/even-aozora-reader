import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { waitForEvenAppBridge } from "@evenrealities/even_hub_sdk";
import App from "./App.tsx";
import { STARTUP_SPLASH_TEXT } from "./constants.ts";
import { PageManager } from "./hud/page-manager.ts";
import { SplashText } from "./hud/pages/splash-text.ts";
import { withTimeout } from "./utils.ts";

const MAX_INIT_ATTEMPTS = 2;

/**
 * 初期化失敗時に自動リトライしながら PageManager を初期化する。
 * base_app の autoconnect パターンを参考にしている。
 */
async function initPageManagerWithRetry(
	bridge: Awaited<ReturnType<typeof waitForEvenAppBridge>>,
): Promise<PageManager | undefined> {
	for (let attempt = 1; attempt <= MAX_INIT_ATTEMPTS; attempt++) {
		try {
			console.log(`[Init] Attempt ${attempt}/${MAX_INIT_ATTEMPTS}`);
			const manager = new PageManager(bridge);
			const success = await manager.init(new SplashText(STARTUP_SPLASH_TEXT));
			if (!success) {
				throw new Error("PageManager.init returned false");
			}
			console.log("[Init] Success");
			return manager;
		} catch (e) {
			console.error(
				`[Init] Attempt ${attempt} failed: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	return undefined;
}

function BootstrapApp() {
	const [manager, setManager] = useState<PageManager | undefined>();
	const [isBootstrapping, setIsBootstrapping] = useState(true);
	const bridgeRef = useRef<Awaited<ReturnType<typeof waitForEvenAppBridge>> | null>(
		null,
	);
	const initInFlightRef = useRef<Promise<PageManager | undefined> | null>(null);
	const startedRef = useRef(false);

	const ensureBridge = useCallback(async () => {
		if (bridgeRef.current) return bridgeRef.current;
		console.log("[Boot] Waiting for Even App Bridge...");
		const bridge = await withTimeout(
			waitForEvenAppBridge(),
			2500,
			"waitForEvenAppBridge timeout",
		);
		bridgeRef.current = bridge;
		console.log("[Boot] Bridge established");
		return bridge;
	}, []);

	const initializeInBackground = useCallback(async () => {
		if (initInFlightRef.current) {
			return initInFlightRef.current;
		}

		initInFlightRef.current = (async () => {
			try {
				const bridge = await ensureBridge();
				console.log("[Boot] Initializing PageManager in background...");
				const nextManager = await initPageManagerWithRetry(bridge);
				if (nextManager) {
					setManager(nextManager);
					console.log("[Boot] PageManager ready");
				} else {
					console.warn(
						"[Boot] PageManager initialization failed; using WebView-only mode",
					);
				}
				return nextManager;
			} catch (e) {
				console.error(
					"[Boot] Failed to establish bridge:",
					e instanceof Error ? e.message : String(e),
				);
				return undefined;
			}
		})();

		try {
			return await initInFlightRef.current;
		} finally {
			initInFlightRef.current = null;
		}
	}, [ensureBridge]);

	const reinitializePageManager = useCallback(async () => {
		console.log("[Runtime] Attempting PageManager reinit...");
		const nextManager = await initializeInBackground();
		if (nextManager) {
			console.log("[Runtime] PageManager reinit succeeded");
		} else {
			console.error("[Runtime] PageManager reinit failed");
		}
		return nextManager;
	}, [initializeInBackground]);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;
		void initializeInBackground().finally(() => {
			setIsBootstrapping(false);
		});
	}, [initializeInBackground]);

	return (
		<App
			manager={manager}
			reinitializeManager={reinitializePageManager}
			isBootstrapping={isBootstrapping}
		/>
	);
}

// biome-ignore lint/style/noNonNullAssertion: root 要素は必ず存在する
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BootstrapApp />
	</StrictMode>,
);
