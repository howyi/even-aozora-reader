import {
	type EvenHubEvent,
	OsEventTypeList,
} from "@evenrealities/even_hub_sdk";

export function getRawEventType(event: EvenHubEvent): unknown {
	const raw = (event.jsonData ?? {}) as Record<string, unknown>;
	return (
		event.listEvent?.eventType ??
		event.textEvent?.eventType ??
		event.sysEvent?.eventType ??
		raw.eventType ??
		raw.event_type ??
		raw.type
	);
}

export function normalizeEventType(
	rawEventType: unknown,
): OsEventTypeList | undefined {
	if (typeof rawEventType === "number") {
		switch (rawEventType) {
			case 0:
				return OsEventTypeList.CLICK_EVENT;
			case 1:
				return OsEventTypeList.SCROLL_TOP_EVENT;
			case 2:
				return OsEventTypeList.SCROLL_BOTTOM_EVENT;
			case 3:
				return OsEventTypeList.DOUBLE_CLICK_EVENT;
			default:
				return undefined;
		}
	}

	if (typeof rawEventType === "string") {
		const normalized = rawEventType.toUpperCase();
		if (normalized.includes("DOUBLE"))
			return OsEventTypeList.DOUBLE_CLICK_EVENT;
		if (normalized.includes("CLICK")) return OsEventTypeList.CLICK_EVENT;
		if (normalized.includes("SCROLL_TOP") || normalized.includes("UP")) {
			return OsEventTypeList.SCROLL_TOP_EVENT;
		}
		if (normalized.includes("SCROLL_BOTTOM") || normalized.includes("DOWN")) {
			return OsEventTypeList.SCROLL_BOTTOM_EVENT;
		}
	}

	return undefined;
}
