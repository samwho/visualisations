import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Exposes a media query as reactive state, for preferences such as reduced motion.
 * Requests a host update and emits `change` with a boolean when the match changes;
 * it does not decide how the component should respond.
 *
 * The initial value is available through matches without an initial event.
 * Reconnection reports any preference change that happened while disconnected.
 */
export class MediaQueryController
	extends EventTarget
	implements ReactiveController
{
	private readonly query: MediaQueryList;

	private previous: boolean;

	/**
	 * Evaluates the query immediately and registers with the host.
	 * @param host Host to update when the query's match changes.
	 * @param query CSS media query passed to matchMedia().
	 */
	constructor(
		private readonly host: ReactiveControllerHost,
		query: string,
	) {
		super();
		this.query = matchMedia(query);
		this.previous = this.query.matches;
		host.addController(this);
	}

	/** Current query result, including before connection or while disconnected. */
	get matches(): boolean {
		return this.query.matches;
	}

	/** Subscribes to changes and reconciles any change since construction or disconnection. */
	hostConnected(): void {
		this.query.addEventListener("change", this.changed);
		// Preferences may have changed while the host was disconnected.
		this.changed();
	}

	/** Removes the listener without discarding the query or its last reported value. */
	hostDisconnected(): void {
		this.query.removeEventListener("change", this.changed);
	}

	/** Updates the host and emits the new match only when it differs from the last report. */
	private readonly changed = (): void => {
		const matches = this.matches;
		if (matches === this.previous) {
			return;
		}
		this.previous = matches;
		this.host.requestUpdate();
		this.dispatchEvent(new CustomEvent("change", { detail: matches }));
	};
}
