import type { ReactiveController } from "lit";
import {
	controllerElement,
	type ControllerHost,
} from "./ElementControllerHost";

type VisibilityHost = ControllerHost;

/** Viewport observation settings for visibility-dependent background work. */
interface VisibilityOptions {
	/** IntersectionObserver margin; defaults to 5px so work can start just before entering view. */
	rootMargin?: string;
}

/**
 * Combines element intersection and page visibility for components that should
 * stop background work while hidden. An element counts as hidden if it is outside
 * the viewport margin or the document is not visible.
 *
 * Starts hidden until initial visibility is known. Emits `hidden`/`visible` on
 * transitions, with `first-visible` immediately before the first visible event
 * of each connection. Use a once-listener for lifetime-only initialisation.
 * Events carry no detail and do not request a host update.
 *
 * Observation waits two animation frames for layout to settle. Without
 * IntersectionObserver, only page visibility gates work. Visibility is a hint
 * for scheduling, not a guarantee that pixels are unobscured on screen.
 */
export class VisibilityController
	extends EventTarget
	implements ReactiveController
{
	private observer?: IntersectionObserver;

	private visibilityHandler?: () => void;

	private visibilityFrame?: number;

	private elementOffScreen = true;

	private pageHidden = false;

	private hidden = true;

	private hasBeenVisible = false;

	/**
	 * Registers element and page visibility with the host lifecycle.
	 * @param host Element or adapter whose element should be observed.
	 * @param options Optional viewport margin for early start or delayed suspension.
	 */
	constructor(
		private readonly host: VisibilityHost,
		private readonly options: VisibilityOptions = {},
	) {
		super();
		host.addController(this);
	}

	/** Current combined hidden state; true before observation and after disconnection. */
	get isHidden(): boolean {
		return this.hidden;
	}

	/** Starts deferred intersection observation and samples/subscribes to page visibility. */
	hostConnected(): void {
		this.setupIntersectionObserver();
		this.setupPageVisibility();
	}

	/** Cancels observers/listeners and resets visibility and per-connection first-visible state. */
	hostDisconnected(): void {
		if (this.visibilityFrame !== undefined) {
			cancelAnimationFrame(this.visibilityFrame);
			this.visibilityFrame = undefined;
		}
		this.observer?.disconnect();
		this.observer = undefined;
		if (typeof document !== "undefined" && this.visibilityHandler) {
			document.removeEventListener("visibilitychange", this.visibilityHandler);
		}
		this.visibilityHandler = undefined;
		this.elementOffScreen = true;
		this.hidden = true;
		this.hasBeenVisible = false;
	}

	/** Defers observation until layout settles, or treats the element as onscreen if unsupported. */
	private setupIntersectionObserver(): void {
		if (typeof IntersectionObserver === "undefined") {
			this.elementOffScreen = false;
			return;
		}
		this.observer = new IntersectionObserver(
			(entries) => {
				const latest = entries.at(-1);
				this.elementOffScreen = latest ? !latest.isIntersecting : false;
				this.updateHiddenState();
			},
			{
				threshold: 0,
				rootMargin: this.options.rootMargin ?? "5px",
			},
		);
		// Let Lit and its child components establish the host's dimensions before
		// observing; a zero-height host can be reported visible below the fold.
		this.visibilityFrame = requestAnimationFrame(() => {
			this.visibilityFrame = requestAnimationFrame(() => {
				this.visibilityFrame = undefined;
				this.observer?.observe(controllerElement(this.host));
			});
		});
	}

	/** Subscribes to document visibility and samples it immediately; assumes a visible page without document. */
	private setupPageVisibility(): void {
		if (typeof document === "undefined") {
			this.pageHidden = false;
			this.updateHiddenState();
			return;
		}
		this.visibilityHandler = () => {
			this.pageHidden = document.visibilityState !== "visible";
			this.updateHiddenState();
		};
		document.addEventListener("visibilitychange", this.visibilityHandler);
		this.visibilityHandler();
	}

	/** Combines visibility inputs and emits transition events, with first-visible before visible. */
	private updateHiddenState(): void {
		const hidden = this.elementOffScreen || this.pageHidden;
		if (hidden === this.hidden) {
			return;
		}
		this.hidden = hidden;
		if (hidden) {
			this.dispatchEvent(new Event("hidden"));
			return;
		}
		if (!this.hasBeenVisible) {
			this.hasBeenVisible = true;
			// First visibility is per connection; once-listeners opt into lifetime initialization.
			this.dispatchEvent(new Event("first-visible"));
		}
		this.dispatchEvent(new Event("visible"));
	}
}
