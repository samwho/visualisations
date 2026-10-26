import * as v from "valibot";

const errorResponse = v.object({ error: v.string() });

export function isLocalPreview(): boolean {
	return ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

export function pingTitle(title = ""): string {
	const staging = window.location.hostname === "staging.samwho.dev";
	const source = staging ? "staging.samwho.dev/ping" : "samwho.dev/ping";
	if (!title) {
		return source;
	}
	return staging ? `${source}: ${title}` : title;
}

export async function sendPing(
	message: string,
	signal: AbortSignal,
	title = "",
): Promise<void> {
	signal.throwIfAborted();
	if (isLocalPreview()) {
		return;
	}
	let response: Response;
	try {
		response = await fetch("https://api.samwho.dev/ping", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: pingTitle(title), message }),
			signal,
		});
	} catch (error) {
		if (signal.aborted) {
			throw error;
		}
		throw new Error(
			"Could not reach the notification service. Check your connection; the browser may be blocking the request.",
			{ cause: error },
		);
	}
	if (response.ok) {
		return;
	}
	const body = v.safeParse(
		errorResponse,
		await response.json().catch(() => null),
	);
	throw new Error(
		body.success
			? body.output.error
			: `Could not send your message (HTTP ${response.status}). Please try again.`,
	);
}
