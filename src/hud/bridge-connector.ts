import {
	DeviceConnectType,
	type EvenAppBridge,
} from "@evenrealities/even_hub_sdk";
import { HUD_ERRORS } from "./errors";
import { createLogger } from "./logger";

const log = createLogger("BridgeConnector");

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
	const timeoutMs = options.timeoutMs ?? 2500;

	const isConnected = async (): Promise<boolean> => {
		try {
			const info = await bridge.getDeviceInfo();
			return info?.status?.connectType === DeviceConnectType.Connected;
		} catch {
			return false;
		}
	};

	async function waitForDeviceConnected(): Promise<boolean> {
		if (await isConnected()) return true;

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
				throw new Error(HUD_ERRORS.DEVICE_NOT_CONNECTED);
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

	const triggerConnect = async () => {
		try {
			await connect();
		} catch (error) {
			log.warn("connect failed", error);
			throw error;
		}
	};

	return {
		connect: triggerConnect,
		waitForDeviceConnected,
	};
}
