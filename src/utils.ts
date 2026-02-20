export async function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	label: string,
): Promise<T> {
	let timeoutHandle: number | undefined;
	const timeout = new Promise<T>((_, reject) => {
		timeoutHandle = window.setTimeout(
			() => reject(new Error(`${label} timed out after ${ms}ms`)),
			ms,
		);
	});

	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (timeoutHandle != null) window.clearTimeout(timeoutHandle);
	}
}
