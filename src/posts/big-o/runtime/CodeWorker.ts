interface TimingRequest {
	code: string;
	onStart: () => void;
	onComplete: (milliseconds: number) => void;
	onError: (message: string) => void;
}
export type TimingMessage =
	| { type: "start" }
	| { type: "complete"; milliseconds: number }
	| { type: "error"; message: string };

// Two reader-initiated runs at a time, without a pool of idle worker processes.
const queue: TimingRequest[] = [];
let running = 0;

export function exec(request: TimingRequest): void {
	queue.push(request);
	drain();
}

function drain(): void {
	while (running < 2 && queue.length > 0) {
		start(queue.shift()!);
	}
}

function start(request: TimingRequest): void {
	const worker = new Worker("/js/build/big-o/code-worker.js", {
		type: "module",
	});
	running += 1;
	const finish = () => {
		worker.terminate();
		running -= 1;
		drain();
	};

	worker.addEventListener("message", (event: MessageEvent<TimingMessage>) => {
		const message = event.data;
		if (message.type === "start") {
			request.onStart();
			return;
		}
		finish();
		if (message.type === "complete") {
			request.onComplete(message.milliseconds);
		} else {
			request.onError(message.message);
		}
	});
	worker.addEventListener("error", (event) => {
		event.preventDefault();
		finish();
		request.onError(event.message);
	});
	// eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker.postMessage has no target-origin parameter.
	worker.postMessage(request.code);
}
