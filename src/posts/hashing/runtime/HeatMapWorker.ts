import type {
	HeatMapCommand,
	HeatMapReply,
	HeatMapRequest,
} from "./HeatMapProtocol";

export interface HeatMapConnection {
	send(message: HeatMapCommand): void;
	disconnect(): void;
}

/** One lazy worker per experiment; comparison canvases share its input cache. */
export class HeatMapWorker {
	private worker?: Worker;

	private nextId = 0;

	private idleTimer?: ReturnType<typeof setTimeout>;

	private readonly listeners = new Map<
		number,
		{
			message: (message: HeatMapReply) => void;
			error: (message: string) => void;
			reset: () => void;
			visible: boolean;
			readerCode: boolean;
		}
	>();

	connect(
		canvas: HTMLCanvasElement,
		message: (reply: HeatMapReply) => void,
		error: (message: string) => void,
		reset: () => void,
	): HeatMapConnection {
		if (!this.worker) {
			const worker = new Worker("/js/build/hashing/heat-map-worker.js", {
				type: "module",
			});
			this.worker = worker;
			worker.addEventListener(
				"message",
				(event: MessageEvent<HeatMapReply>) => {
					this.listeners.get(event.data.id)?.message(event.data);
				},
			);
			worker.addEventListener("error", (event) => {
				// A replaced worker must not report errors to its successor.
				event.preventDefault();
				if (this.worker !== worker) {
					return;
				}
				for (const listener of this.listeners.values()) {
					listener.error(event.message);
				}
			});
		}
		const id = ++this.nextId;
		const listener = {
			message,
			error,
			reset,
			visible: false,
			readerCode: false,
		};
		this.listeners.set(id, listener);
		const offscreen = canvas.transferControlToOffscreen();
		const init: HeatMapRequest = { type: "init", id, canvas: offscreen };
		this.worker.postMessage(init, [offscreen]);
		return {
			send: (command) => {
				const request: HeatMapRequest = { ...command, id };
				if (command.type === "visibility") {
					listener.visible = command.visible;
				} else if (command.type === "render") {
					listener.readerCode = command.config.source !== undefined;
				}
				this.worker?.postMessage(request);
				this.scheduleIdleRelease();
			},
			disconnect: () => {
				this.worker?.postMessage({
					type: "remove",
					id,
				} satisfies HeatMapRequest);
				this.listeners.delete(id);
				if (this.listeners.size === 0) {
					clearTimeout(this.idleTimer);
					this.idleTimer = undefined;
					this.worker?.terminate();
					this.worker = undefined;
				}
			},
		};
	}

	private scheduleIdleRelease(): void {
		// Never re-import a reader module merely because it scrolled offscreen.
		if (
			[...this.listeners.values()].some(
				(listener) => listener.visible || listener.readerCode,
			)
		) {
			clearTimeout(this.idleTimer);
			this.idleTimer = undefined;
			return;
		}
		if (this.idleTimer !== undefined) {
			return;
		}
		this.idleTimer = setTimeout(() => {
			this.idleTimer = undefined;
			this.worker?.terminate();
			this.worker = undefined;
			const listeners = [...this.listeners.values()];
			this.listeners.clear();
			for (const listener of listeners) {
				listener.reset();
			}
		}, 30000);
	}
}
