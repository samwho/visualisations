import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Tracks window.innerWidth/innerHeight for components tied to the page viewport.
 * Use ResizeController instead when only an element's own box matters.
 *
 * Coalesces window resize events into a frame, requests a host update, and emits
 * `resize` with `{ width, height }` when the dimensions change. These are layout
 * viewport dimensions, not VisualViewport dimensions or element measurements.
 */
export class PageResizeController
	extends EventTarget
	implements ReactiveController
{
	/** Last measured viewport width in CSS pixels; zero before connection. */
	width = 0;

	/** Last measured viewport height in CSS pixels; zero before connection. */
	height = 0;

	private frame?: number;

	/** Registers viewport measurements and reactive updates with the host. */
	constructor(private readonly host: ReactiveControllerHost) {
		super();
		host.addController(this);
	}

	/** Measures immediately and starts listening; emits resize if the stored dimensions differ. */
	hostConnected(): void {
		this.measure();
		window.addEventListener("resize", this.onResize);
	}

	/** Removes the window listener and cancels a queued measurement, retaining the last size. */
	hostDisconnected(): void {
		window.removeEventListener("resize", this.onResize);
		if (this.frame !== undefined) {
			cancelAnimationFrame(this.frame);
			this.frame = undefined;
		}
	}

	/** Coalesces a burst of window events into one measurement on the next animation frame. */
	private readonly onResize = (): void => {
		if (this.frame !== undefined) {
			return;
		}
		this.frame = requestAnimationFrame(() => {
			this.frame = undefined;
			this.measure();
		});
	};

	/** Reads viewport dimensions and updates the host and listeners only if the size changed. */
	private measure(): void {
		const width = window.innerWidth;
		const height = window.innerHeight;
		if (width !== this.width || height !== this.height) {
			this.width = width;
			this.height = height;
			this.host.requestUpdate();
			this.dispatchEvent(
				new CustomEvent("resize", { detail: { width, height } }),
			);
		}
	}
}
