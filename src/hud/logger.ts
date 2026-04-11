type LogLevel = "debug" | "info" | "warn" | "error";

const PRIORITY: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

function resolveLogLevel(): LogLevel {
	const raw = (import.meta.env.VITE_LOG_LEVEL ?? "").toLowerCase();
	if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
		return raw;
	}
	if (import.meta.env.DEV) return "debug";
	return "info";
}

export function createLogger(scope: string) {
	const minimum = resolveLogLevel();

	const write = (level: LogLevel, message: string, extra?: unknown) => {
		if (PRIORITY[level] < PRIORITY[minimum]) return;
		const payload = `[${scope}] ${message}`;
		if (extra === undefined) {
			console[level](payload);
		} else {
			console[level](payload, extra);
		}
	};

	return {
		debug: (message: string, extra?: unknown) => write("debug", message, extra),
		info: (message: string, extra?: unknown) => write("info", message, extra),
		warn: (message: string, extra?: unknown) => write("warn", message, extra),
		error: (message: string, extra?: unknown) => write("error", message, extra),
	};
}
