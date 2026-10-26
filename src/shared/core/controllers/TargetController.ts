import {
	LitElement,
	type ReactiveController,
	type ReactiveControllerHost,
} from "lit";

type TargetHost = ReactiveControllerHost & HTMLElement;

/** Fixed target lookup and the runtime type check used after custom-element upgrade. */
interface TargetOptions<T extends HTMLElement> {
	/** ID captured on the first connection; later changes are ignored. */
	id: () => string;
	/** Accepts the upgraded target and narrows its type; rejection ends lookup. */
	isTarget: (element: HTMLElement) => element is T;
}

/**
 * Connects a component to one fixed, document-level target, such as a chart's
 * companion controls. Set the ID before the host first connects.
 *
 * Waits for the element to appear, for custom-element definition, and for a Lit
 * target's initial update. Emits `connected`/`disconnected` with the target element
 * as detail when the host connects/disconnects. The connected event also requests
 * a host update. Reconnection reuses the resolved target.
 *
 * ID changes, shadow-root lookup and target replacement are not supported. Once
 * an element with the ID is found, a failed type check does not restart lookup.
 */
export class TargetController<T extends HTMLElement>
	extends EventTarget
	implements ReactiveController
{
	/** Accepted target after upgrade/render; retained even when the host is disconnected. */
	element?: T;

	private id?: string;

	private targetFound = false;

	private connected = false;

	private observer?: MutationObserver;

	/**
	 * Registers fixed-ID resolution with the host.
	 * @param host Host whose ownerDocument contains the target.
	 * @param options Supplies the initial ID and validates the upgraded element.
	 */
	constructor(
		private readonly host: TargetHost,
		private readonly options: TargetOptions<T>,
	) {
		super();
		host.addController(this);
	}

	/** Captures the initial ID, reuses a known target, or watches the document until it appears. */
	hostConnected(): void {
		this.connected = true;
		this.id ??= this.options.id();
		if (this.element) {
			this.connect();
		} else if (!this.targetFound) {
			this.resolve();
			if (!this.targetFound) {
				this.observer = new MutationObserver(this.resolve);
				this.observer.observe(this.host.ownerDocument, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["id"],
				});
			}
		}
	}

	/** Stops lookup observation and emits disconnected for a prepared target without forgetting it. */
	hostDisconnected(): void {
		this.connected = false;
		this.observer?.disconnect();
		this.observer = undefined;
		if (this.element) {
			this.dispatchEvent(
				new CustomEvent("disconnected", { detail: this.element }),
			);
		}
	}

	/** Claims the first matching ID, stops observing, and starts preparation; logs preparation failures. */
	private readonly resolve = (): void => {
		if (!this.connected || this.targetFound) {
			return;
		}
		const target = this.host.ownerDocument.getElementById(this.id!);
		if (!target) {
			return;
		}
		this.targetFound = true;
		this.observer?.disconnect();
		this.observer = undefined;
		void this.prepare(target).catch(console.error);
	};

	/**
	 * Waits for definition and the first Lit update before accepting and exposing
	 * the target. Can finish while disconnected; connect() then waits for reconnect.
	 * @param target First element found with the captured ID.
	 */
	private async prepare(target: HTMLElement): Promise<void> {
		if (target.localName.includes("-")) {
			const registry =
				this.host.ownerDocument.defaultView?.customElements ?? customElements;
			await registry.whenDefined(target.localName);
		}
		if (!this.options.isTarget(target)) {
			return;
		}
		if (target instanceof LitElement) {
			await target.updateComplete;
		}
		this.element = target;
		this.connect();
	}

	/** Emits the prepared target and requests rendering only while the host is connected. */
	private connect(): void {
		if (!this.connected || !this.element) {
			return;
		}
		this.dispatchEvent(new CustomEvent("connected", { detail: this.element }));
		this.host.requestUpdate();
	}
}
