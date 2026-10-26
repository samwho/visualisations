import type { ReactiveController, ReactiveControllerHost } from "lit";

type ThemeHost = ReactiveControllerHost & HTMLElement;

/**
 * Mirrors the document's data-theme onto the host so its shadow CSS can use
 * theme-specific selectors. Use `change` to invalidate theme-dependent paint
 * caches; queue canvas configuration through FrameController.requestDrawWith().
 *
 * Emits `change` with the theme string on each connection and whenever it changes.
 * A missing document theme means `light`. Connected instances share one document
 * observer. This controller does not select the page theme or request a host update.
 */
export class ThemeController extends EventTarget implements ReactiveController {
	private static readonly connected = new Set<ThemeController>();

	private static observer: MutationObserver | undefined;

	private theme?: string;

	/** Registers a themed element with the host lifecycle. */
	constructor(private readonly host: ThemeHost) {
		super();
		host.addController(this);
	}

	/** Mirrors and emits the current theme, joining the shared document observer. */
	hostConnected(): void {
		ThemeController.connected.add(this);
		this.sync();
		if (!ThemeController.observer) {
			ThemeController.observer = new MutationObserver(() => {
				for (const controller of ThemeController.connected) {
					controller.sync();
				}
			});
			ThemeController.observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-theme"],
			});
		}
	}

	/** Leaves the shared observer and forgets the reported theme so reconnect emits it again. */
	hostDisconnected(): void {
		this.theme = undefined;
		ThemeController.connected.delete(this);
		if (ThemeController.connected.size === 0) {
			ThemeController.observer?.disconnect();
			ThemeController.observer = undefined;
		}
	}

	/** Copies data-theme to the host and emits only a new theme or the first theme of a connection. */
	private sync(): void {
		const theme = document.documentElement.dataset.theme ?? "light";
		this.host.dataset.theme = theme;
		if (theme === this.theme) {
			return;
		}
		this.theme = theme;
		// Notify on connection too; paint caches may have outlived their theme.
		this.dispatchEvent(new CustomEvent("change", { detail: theme }));
	}
}
