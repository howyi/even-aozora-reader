import { StrictMode, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { createAppRuntime } from "./hud/app-runtime";

function BootstrapApp() {
	const runtimeRef = useRef<ReturnType<typeof createAppRuntime> | null>(null);
	if (!runtimeRef.current) {
		runtimeRef.current = createAppRuntime();
	}
	const [manager, setManager] = useState(runtimeRef.current.getManager());
	const [isBootstrapping, setIsBootstrapping] = useState(true);
	const startedRef = useRef(false);

	const initializeInBackground = useCallback(async () => {
		const nextManager = await runtimeRef.current?.initializeInBackground();
		if (nextManager) {
			setManager(nextManager);
		}
		return nextManager;
	}, []);

	const reinitializePageManager = useCallback(async () => {
		const nextManager = await runtimeRef.current?.reinitialize();
		if (nextManager) setManager(nextManager);
		return nextManager;
	}, []);

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
