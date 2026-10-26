import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import { visuallyHiddenStyles } from "../../../shared/styles/Accessibility";
import type { Hasher, Values } from "../model/Hashers";
import { inputSource, type InputSource } from "../model/HeatMapModel";
import type { HashSource, HeatMapCommand } from "../runtime/HeatMapProtocol";

import {
	HeatMapWorker,
	type HeatMapConnection,
} from "../runtime/HeatMapWorker";

type PaletteColor =
	| "orange"
	| "blue"
	| "green"
	| "yellow"
	| "dark-blue"
	| "red"
	| "pink"
	| "grey";

@customElement("s-heat-map")
export class HeatMap extends LitElement {
	@property({ type: Number }) iterations = 10000;

	@property({ type: Number }) columns = 36;

	@property({ type: Number }) rows = 18;

	@property({ attribute: "hashfn" }) hashFn: Hasher = "murmur3";

	@property({ attribute: "valuefn" }) valueFn: Values = "intToStr";

	@property({ type: Number }) seed = 0;

	@property() color: PaletteColor = "blue";

	@property({ type: Boolean }) playground = false;

	@property({ attribute: false }) source?: HashSource;

	@property({ attribute: false }) workerGroup?: HeatMapWorker;

	@property({ type: Boolean }) pending = false;

	@property({ attribute: false }) inputs?: InputSource;

	@property({ type: Number }) progress?: number;

	@property({ type: Number }) seedCacheLimit = 0;

	@state() private canvas = document.createElement("canvas");

	@state() private previousCanvas?: HTMLCanvasElement;

	@state() private running = true;

	@state() private loading = false;

	@state() private error = "";

	private loadingTimer?: number;

	private readonly frames = new FrameController(
		this,
		new TimelineController(this, undefined, { pauseOffscreen: false }),
	);

	private dirty = false;

	private awaitingAcceptance = false;

	private sentSourceId?: number;

	private width = 0;

	private height = 0;

	private paintColor = "";

	private ready = false;

	private hasCustomHash = false;

	private drawn = false;

	private connection?: HeatMapConnection;

	private submittedGeneration = 0;

	private displayedGeneration = 0;

	private readonly syncVisibility = (): void => {
		const visible = !this.visibility.isHidden && !document.hidden;
		this.send({ type: "visibility", visible });
		if (!document.hidden && (visible || this.source)) {
			this.redraw();
		} else {
			this.stopLoading();
		}
	};

	private ownInputs = inputSource(this.valueFn);

	private readonly visibility = new VisibilityController(this, {
		rootMargin: "0px",
	});

	private readonly timeline = new TimelineController(this, this.visibility);

	constructor() {
		super();
		const resize = new ResizeController(this);
		resize.addEventListener("resize", (event) => {
			// SAFETY: ResizeController forwards its ResizeObserverEntry.
			const entry = (event as CustomEvent<ResizeObserverEntry>).detail;
			this.width = entry.contentRect.width;
			this.height = entry.contentRect.height;
			// Article bitmaps have fixed bucket dimensions; CSS alone scales them.
			if (this.playground) {
				this.resizeGrid();
			}
		});

		this.frames.addEventListener("draw", () => {
			if (this.dirty && !this.awaitingAcceptance) {
				this.flushRender();
			}
		});
		const theme = new ThemeController(this);
		theme.addEventListener("change", () => {
			this.paintColor = "";
			this.redraw();
		});

		this.visibility.addEventListener("hidden", () => this.syncVisibility());
		this.visibility.addEventListener("visible", () => {
			this.ready = true;
			this.syncVisibility();
		});
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.timeline.resume();
		document.addEventListener("visibilitychange", this.syncVisibility);
		if (this.hasUpdated) {
			this.redraw();
		}
	}

	override disconnectedCallback(): void {
		this.connection?.disconnect();
		this.connection = undefined;
		this.awaitingAcceptance = false;
		this.dirty = false;
		this.width = this.height = 0;
		this.stopLoading();
		document.removeEventListener("visibilitychange", this.syncVisibility);
		this.ready = false;
		this.previousCanvas = undefined;
		this.canvas = document.createElement("canvas");
		this.drawn = false;
		super.disconnectedCallback();
	}

	static override styles = [
		visuallyHiddenStyles,
		css`
			:host {
				display: block;
				position: relative;
				min-width: 0;
				min-height: 0;
			}
			.loading {
				position: absolute;
				inset: var(--space-2) var(--space-2) auto auto;
				display: flex;
				align-items: center;
				gap: var(--space-2);
				padding: var(--space-2) var(--space-3);
				border-radius: var(--radius-control);
				background: var(--color-surface-raised);
				color: var(--color-text-primary);
				font: var(--font-size-small) var(--font-family-code, monospace);
				pointer-events: none;
				box-sizing: border-box;
				max-width: calc(100% - 2 * var(--space-2));
				overflow-wrap: anywhere;
			}
			.indicator {
				padding: var(--space-1);
			}
			.spinner {
				width: 0.75em;
				height: 0.75em;
				border: var(--border-width-thin) solid currentColor;
				border-right-color: transparent;
				border-radius: var(--radius-circle);
				animation: spin 1s linear infinite;
			}
			@keyframes spin {
				to {
					transform: rotate(1turn);
				}
			}
			@media (prefers-reduced-motion: reduce) {
				.spinner {
					animation: none;
				}
			}
			canvas {
				display: block;
				width: 100%;
				height: 100%;
				position: absolute;
				inset: 0;
				image-rendering: pixelated;
			}
		`,
	];

	private send(message: HeatMapCommand): void {
		this.connection?.send(message);
	}

	private startWorker(): void {
		const group = this.source
			? new HeatMapWorker()
			: (this.workerGroup ?? new HeatMapWorker());
		this.sentSourceId = undefined;
		const connection = group.connect(
			this.canvas,
			(message) => {
				if (connection !== this.connection) {
					return;
				}
				if (message.type === "accepted") {
					if (message.generation !== this.submittedGeneration) {
						return;
					}
					this.awaitingAcceptance = false;
					this.scheduleRender();
					return;
				}
				if (message.type === "compiled") {
					if (message.sourceId !== this.source?.id) {
						return;
					}
					this.hasCustomHash = true;
					this.dispatchEvent(
						new CustomEvent("hash-ready", { bubbles: true, composed: true }),
					);
					this.requestUpdate();
					return;
				}
				if (message.type === "error") {
					// Compilation errors belong to the editor source; render errors
					// belong to the latest submitted generation.
					if (
						message.sourceId === undefined
							? message.generation !== this.submittedGeneration
							: message.sourceId !== this.source?.id
					) {
						return;
					}
					this.error = message.message;
					this.running = false;
					this.stopLoading();
					this.dispatchEvent(
						new CustomEvent("hash-error", {
							detail: message.message,
							bubbles: true,
							composed: true,
						}),
					);
				} else {
					if (message.generation < this.displayedGeneration) {
						return;
					}
					this.displayedGeneration = message.generation;
					this.drawn = true;
					this.previousCanvas = undefined;
					this.running =
						!message.complete ||
						message.generation < this.submittedGeneration ||
						this.dirty;
					this.stopLoading();
					if (this.running) {
						this.scheduleLoading();
					}
				}
			},
			(message) => {
				if (connection !== this.connection) {
					return;
				}
				this.error = message;
				this.running = false;
				this.stopLoading();
				this.dispatchEvent(
					new CustomEvent("hash-error", {
						detail: message,
						bubbles: true,
						composed: true,
					}),
				);
			},
			() => this.resetWorker(),
		);
		this.connection = connection;
		this.send({
			type: "visibility",
			visible: !this.visibility.isHidden && !document.hidden,
		});
	}

	private resetWorker(): void {
		this.connection?.disconnect();
		this.connection = undefined;
		this.awaitingAcceptance = false;
		this.dirty = false;
		if (this.drawn) {
			this.previousCanvas = this.canvas;
		}
		this.canvas = document.createElement("canvas");
		this.drawn = false;
		this.running = false;
		this.stopLoading();
	}

	protected override updated(changed: PropertyValues): void {
		if (changed.has("color")) {
			this.paintColor = "";
		}
		if (changed.has("valueFn")) {
			this.ownInputs = inputSource(this.valueFn);
		}
		if (changed.has("source") && this.connection && this.running) {
			// Discard a busy worker when code changes, including a hash stuck in an infinite loop.
			this.resetWorker();
		}
		if (
			[
				"columns",
				"rows",
				"iterations",
				"hashFn",
				"valueFn",
				"seed",
				"playground",
				"source",
				"inputs",
				"progress",
				"seedCacheLimit",
				"color",
			].some((key) => changed.has(key))
		) {
			this.redraw();
		}
	}

	redraw(): void {
		if (
			(!this.ready && !this.source) ||
			!this.isConnected ||
			document.hidden ||
			(this.visibility.isHidden && !this.source)
		) {
			return;
		}
		this.error = "";
		this.dirty = true;
		this.running = true;
		this.scheduleLoading();
		this.scheduleRender();
	}

	private scheduleLoading(): void {
		if (this.loadingTimer === undefined && !this.loading) {
			this.loadingTimer = this.timeline.setTimeout(() => {
				this.loadingTimer = undefined;
				if (this.running && !this.visibility.isHidden) {
					this.loading = true;
				}
			}, 100);
		}
	}

	private stopLoading(): void {
		if (this.loadingTimer !== undefined) {
			this.timeline.clearTimeout(this.loadingTimer);
		}
		this.loadingTimer = undefined;
		this.loading = false;
	}

	private scheduleRender(): void {
		// One unacknowledged message, one latest pending state; never a drag-sized queue.
		if (!this.dirty || this.awaitingAcceptance) {
			return;
		}
		this.frames.requestDraw();
	}

	private resizeGrid(): void {
		if (!this.width || !this.height) {
			return;
		}
		const cell = Math.max(16, Math.sqrt((this.width * this.height) / 4096));
		this.columns = Math.max(1, Math.floor(this.width / cell));
		this.rows = Math.max(1, Math.floor(this.height / cell));
	}

	private flushRender(): void {
		if (!this.isConnected) {
			return;
		}
		if (!this.width || !this.height) {
			const { width, height } = this.getBoundingClientRect();
			this.width = width;
			this.height = height;
		}
		const { width, height } = this;
		if (!width || !height) {
			return;
		}
		if (this.playground) {
			this.resizeGrid();
		}
		if (!this.connection) {
			this.startWorker();
		}
		this.dirty = false;
		this.awaitingAcceptance = true;
		const generation = ++this.submittedGeneration;
		this.paintColor ||= getComputedStyle(this)
			.getPropertyValue(`--color-data-fill-${this.color}`)
			.trim();
		this.send({
			type: "render",
			generation,
			config: {
				inputs: this.inputs ?? this.ownInputs,
				hashFn: this.hashFn,
				source: this.source
					? {
							id: this.source.id,
							code:
								this.source.id === this.sentSourceId
									? undefined
									: this.source.code,
						}
					: undefined,
				seed: this.seed,
				columns: this.columns,
				rows: this.rows,
				iterations: this.iterations,
				progress: this.progress ?? this.iterations,
				color: this.paintColor,
				seedCacheLimit: this.seedCacheLimit,
			},
		});
		this.sentSourceId = this.source?.id;
	}

	protected override render() {
		this.canvas.style.objectFit = this.playground ? "contain" : "fill";
		this.canvas.setAttribute("role", "img");
		this.canvas.setAttribute(
			"aria-label",
			`${this.source && this.hasCustomHash ? "Custom" : this.hashFn} hash distribution: ${this.progress ?? this.iterations} inputs`,
		);
		this.canvas.setAttribute(
			"aria-busy",
			String(!this.ready || this.running || this.pending),
		);
		this.canvas.style.visibility =
			this.previousCanvas && !this.drawn ? "hidden" : "visible";
		if (this.previousCanvas) {
			this.previousCanvas.removeAttribute("aria-hidden");
			this.previousCanvas.setAttribute(
				"aria-label",
				this.canvas.getAttribute("aria-label")!,
			);
			this.previousCanvas.setAttribute(
				"aria-busy",
				this.canvas.getAttribute("aria-busy")!,
			);
			this.canvas.setAttribute("aria-hidden", "true");
		} else {
			this.canvas.removeAttribute("aria-hidden");
		}
		return html`${this.previousCanvas ?? nothing}${this.canvas}${
			this.error && !this.playground
				? html`<span
						class="loading"
						role="alert"
						>${this.error}</span
					>`
				: this.loading
					? html`<span
							class="loading indicator"
							role="status"
							><span
								class="spinner"
								aria-hidden="true"
							></span
							><span class="visually-hidden">Calculating…</span></span
						>`
					: nothing
		}`;
	}
}
