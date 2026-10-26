import type { ReactiveController, ReactiveControllerHost } from "lit";

type ResizeHost = ReactiveControllerHost & HTMLElement;

/**
 * Watches an element's box with ResizeObserver, rather than the page viewport.
 * Observes the host by default, or a rendered descendant selected by getTarget.
 * Rechecks that target after each host update so replaced descendants are followed.
 *
 * Emits `resize` with the latest ResizeObserverEntry on a later animation frame,
 * outside observer delivery. Use the entry's measurements instead of forcing
 * another layout read. It does not request a host update or repaint; queue canvas
 * buffer changes through FrameController.requestDrawWith().
 */
export class ResizeController
	extends EventTarget
	implements ReactiveController
{
	private observer?: ResizeObserver;

	private target?: Element;

	private entry?: ResizeObserverEntry;

	private frame?: number;

	/**
	 * Registers element-size observation with the host.
	 * @param host Element and lifecycle owner to observe by default.
	 * @param getTarget Optional selector run on connection and host updates.
	 * Returning undefined suspends observation until a later update finds a target.
	 */
	constructor(
		private readonly host: ResizeHost,
		private readonly getTarget?: () => Element | undefined,
	) {
		super();
		host.addController(this);
	}

	/** Creates the observer and starts watching the currently available target. */
	hostConnected(): void {
		this.observer = new ResizeObserver(([entry]) => {
			if (!entry || entry.target !== this.target) {
				return;
			}
			this.entry = entry;
			if (this.frame !== undefined) {
				return;
			}
			this.frame = requestAnimationFrame(() => {
				this.frame = undefined;
				const latest = this.entry;
				this.entry = undefined;
				if (latest) {
					// RO supplies these measurements; do not add synchronous geometry reads.
					this.dispatchEvent(new CustomEvent("resize", { detail: latest }));
				}
			});
		});
		this.observeTarget();
	}

	/** Follows a rendered target that appeared, disappeared or changed during the host update. */
	hostUpdated(): void {
		this.observeTarget();
	}

	/** Cancels pending delivery and disconnects the observer, forgetting the target. */
	hostDisconnected(): void {
		this.clearPending();
		this.observer?.disconnect();
		this.observer = undefined;
		this.target = undefined;
	}

	/** Switches observation only when target identity changes, dropping measurements from the old target. */
	private observeTarget(): void {
		if (!this.observer) {
			return;
		}
		const target = this.getTarget ? this.getTarget() : this.host;
		if (target === this.target) {
			return;
		}
		if (this.target) {
			this.observer.unobserve(this.target);
		}
		this.clearPending();
		this.target = target;
		if (target) {
			this.observer.observe(target);
		}
	}

	/** Cancels the deferred notification and discards its saved observer entry. */
	private clearPending(): void {
		if (this.frame !== undefined) {
			cancelAnimationFrame(this.frame);
		}
		this.frame = undefined;
		this.entry = undefined;
	}
}
