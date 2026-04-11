import {
	DeviceConnectType,
	type EvenAppBridge,
} from "@evenrealities/even_hub_sdk";

export type BridgeConnectorOptions = {
	onConnecting?: () => void | Promise<void>;
	onConnected?: () => void | Promise<void>;
	timeoutMs?: number;
};

/**
 * Bridge 接続を管理し、重複接続の抑止と状態コールバックを提供する。
 * base_app の createAutoConnector パターンを参考にしている。
 */
export function createBridgeConnector(
	bridge: EvenAppBridge,
	options: BridgeConnectorOptions = {},
) {
	let connectInFlight: Promise<void> | null = null;
	const timeoutMs = options.timeoutMs ?? 4000;

	async function waitForDeviceConnected(): Promise<boolean> {
		try {
			const info = await bridge.getDeviceInfo();
			if (info?.status?.connectType === DeviceConnectType.Connected) {
				return true;
			}
		} catch (e) {
			console.warn("[BridgeConnector] getDeviceInfo failed:", e);
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

	async function connect(): Promise<void> {
		if (connectInFlight) {
			await connectInFlight;
			return;
		}

		connectInFlight = (async () => {
			if (options.onConnecting) {
				await options.onConnecting();
			}

			const connected = await waitForDeviceConnected();
			if (!connected) {
				throw new Error(
					"Device not connected after timeout. Please check connection status.",
				);
			}

			if (options.onConnected) {
				await options.onConnected();
			}
		})();

		try {
			await connectInFlight;
		} finally {
			connectInFlight = null;
		}
	}

	return {
		connect,
		waitForDeviceConnected,
	};
}
