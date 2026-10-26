import type { ReactiveController, ReactiveControllerHost } from "lit";

/** A Lit-compatible lifecycle host, either an element itself or an adapter around one. */
export type ControllerHost = ReactiveControllerHost &
	(HTMLElement | { readonly element: Element });

/** Returns the DOM element used for visibility checks, unwrapping an adapter if needed. */
export function controllerElement(host: ControllerHost): Element {
	return "element" in host ? host.element : host;
}

/**
 * Lets existing, non-Lit markup use reactive controllers without adding a wrapper.
 * Starts connected and forwards pagehide/pageshow to registered controllers,
 * including when a page returns from the back/forward cache.
 *
 * It does not observe element insertion/removal or run Lit update hooks. Owners
 * render directly from controller events; requestUpdate() is deliberately a no-op.
 */
export class ElementControllerHost implements ReactiveControllerHost {
	private readonly controllers = new Set<ReactiveController>();

	private connected = true;

	/** Already-resolved compatibility promise; this host has no asynchronous render cycle. */
	readonly updateComplete = Promise.resolve(true);

	/**
	 * Wraps an element and installs page-lifetime connection listeners.
	 * @param element Element used by controllers that need a DOM target.
	 */
	constructor(readonly element: Element) {
		window.addEventListener("pagehide", this.disconnect);
		window.addEventListener("pageshow", this.connect);
	}

	/** Registers a controller and connects it immediately if the page is active. */
	addController(controller: ReactiveController): void {
		this.controllers.add(controller);
		if (this.connected) {
			controller.hostConnected?.();
		}
	}

	/** Stops forwarding lifecycle hooks; does not call hostDisconnected() or clean up the controller. */
	removeController(controller: ReactiveController): void {
		this.controllers.delete(controller);
	}

	/** Satisfies the Lit host interface without scheduling rendering; owners paint from events. */
	requestUpdate(): void {
		// Non-Lit owners render directly from controller events.
	}

	/** Reconnects registered controllers on pageshow, ignoring duplicate notifications. */
	private readonly connect = (): void => {
		if (this.connected) {
			return;
		}
		this.connected = true;
		for (const controller of this.controllers) {
			controller.hostConnected?.();
		}
	};

	/** Disconnects registered controllers on pagehide so their observers and work can stop. */
	private readonly disconnect = (): void => {
		if (!this.connected) {
			return;
		}
		this.connected = false;
		for (const controller of this.controllers) {
			controller.hostDisconnected?.();
		}
	};
}
