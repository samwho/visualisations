import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Tracks device pixel ratio independently of layout size, for canvas backing
 * buffers that must stay sharp after zooming or moving between monitors.
 * Emits `change` with the numeric ratio on every connection and on density changes.
 * Queue buffer resizing with FrameController.requestDrawWith() so it is repainted
 * in the same frame. This controller does not request a host update.
 */
export class DPRController extends EventTarget implements ReactiveController {
	private query?: MediaQueryList;

	private value = 1;

	/** Registers density tracking with the host's lifecycle. */
	constructor(host: ReactiveControllerHost) {
		super();
		host.addController(this);
	}

	/** Last observed pixel ratio; defaults to 1 before the first connection. */
	get ratio(): number {
		return this.value;
	}

	/** Starts watching the current density and emits it, even if unchanged on reconnect. */
	hostConnected(): void {
		this.watch();
		this.dispatchEvent(new CustomEvent("change", { detail: this.value }));
	}

	/** Removes the density listener while retaining the last observed ratio. */
	hostDisconnected(): void {
		this.query?.removeEventListener("change", this.changed);
		this.query = undefined;
	}

	/** Reads the current ratio and arms a query that stops matching when density changes. */
	private watch(): void {
		this.query?.removeEventListener("change", this.changed);
		this.value = window.devicePixelRatio;
		// The old density query stops matching once; re-arm for the new density.
		this.query = matchMedia(`(resolution: ${this.value}dppx)`);
		this.query.addEventListener("change", this.changed);
	}

	/** Re-arms the query at the new density and notifies only when the ratio changed. */
	private readonly changed = (): void => {
		const previous = this.value;
		this.watch();
		if (this.value !== previous) {
			this.dispatchEvent(new CustomEvent("change", { detail: this.value }));
		}
	};
}
