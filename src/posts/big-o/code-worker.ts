import type { TimingMessage } from "./runtime/CodeWorker";

self.addEventListener("message", (event: MessageEvent<string>) => {
	const send = (message: TimingMessage) => {
		// eslint-disable-next-line unicorn/require-post-message-target-origin -- This module runs in a Worker, not a Window.
		self.postMessage(message);
	};

	try {
		// SAFETY: all submitted examples are bundled, synchronous statements with no return.
		// eslint-disable-next-line typescript/no-implied-eval -- The post explicitly times execution of its bundled JavaScript examples after Run is pressed.
		const run = new Function(event.data) as () => void;
		send({ type: "start" });
		const start = performance.now();
		run();
		send({ type: "complete", milliseconds: performance.now() - start });
	} catch (error) {
		send({
			type: "error",
			message: error instanceof Error ? error.message : String(error),
		});
	}
});
