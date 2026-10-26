import { css, html, LitElement, nothing } from "lit";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import type { AllocatorCall } from "../runtime/Simulation";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import {
	type AllocatorKind,
	simulateArticle,
} from "../model/ArticleSimulation";
import type {
	MemoryByte,
	Operation,
	Snapshot,
	TextAnnotation,
} from "../model/MemoryFrame";
import { ElementParser } from "../runtime/ElementParser";
import type { Slider } from "../../../shared/components/Slider";
import type { CallRailCall } from "./CallRail";
import type { TimelineControls } from "./TimelineControls";
import { renderMemoryAnnotations } from "./MemoryAnnotations";
import "../../../shared/components/Card";
import "./CallRail";
import "./TimelineControls";

@customElement("s-memory")
export class Memory extends LitElement {
	@property({ type: Number }) bytes = 32;

	@property({ type: Number }) columns = 16;

	@property({ type: String }) allocator: AllocatorKind = "manual";

	@property({ type: String }) description =
		"A memory allocation visualization.";

	@property({ type: Boolean, attribute: "static" }) staticView = false;

	@property({ type: Boolean, attribute: "show-addresses" }) showAddresses =
		false;

	@property({ type: Boolean, attribute: "selectable-addresses" })
	selectableAddresses = false;

	@property({ type: Boolean, attribute: "no-coalesce" }) noCoalesce = false;

	@property({ type: Number, attribute: "minimum-size" }) minimumSize = 0;

	@property({ type: Number, attribute: "small-segment-size" })
	smallSegmentSize = 6;

	@property({ type: Number, attribute: "small-threshold" }) smallThreshold = 3;

	@property({ type: Boolean, reflect: true }) playground = false;

	@property({ attribute: false }) snapshots?: Snapshot[];

	@state() private currentStep = 0;

	@state() private highlightedAddress?: number;

	@state() private timeline: Snapshot[] = [];

	private articleCalls: AllocatorCall[] = [];

	private timelineReady = false;

	constructor() {
		super();
		new ThemeController(this);
		const visibility = new VisibilityController(this, { rootMargin: "200px" });
		visibility.addEventListener("first-visible", () => this.ensureTimeline(), {
			once: true,
		});
		const syncHighlight = () => {
			this.style.setProperty(
				"--_highlight-play-state",
				visibility.isHidden ? "paused" : "running",
			);
		};

		visibility.addEventListener("visible", syncHighlight);
		visibility.addEventListener("hidden", syncHighlight);
	}

	static override styles = css`
		:host {
			--memory-byte-label-color: var(--gray-700);
			--memory-free-list-segregated: var(--gray-700);
			--_recent-outline-width: var(--border-width-thick);
			display: block;
			width: 100%;
			color: var(--color-text-primary);
		}
		:host([data-theme="dark"]) {
			--memory-byte-label-color: var(--gray-300);
			--memory-free-list-segregated: var(--gray-400);
			--memory-recent-allocated-outline: color-mix(
				in srgb,
				var(--memory-allocated) 25%,
				var(--white)
			);
		}

		.call-header {
			margin: 0;
			--call-rail-border-radius: 0;
		}

		.memory-body {
			box-sizing: border-box;
			padding: var(--space-4);
		}

		.grid {
			--byte-surface: var(--color-surface-default);
			--grid-gap: clamp(var(--space-half), 0.7vw, var(--space-1));
			display: grid;
			grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
			gap: var(--grid-gap);
			width: 100%;
		}

		.byte {
			--range-color: var(--memory-free-list-default);
			--byte-fill: var(--memory-available);
			--byte-alpha: 1;
			--byte-label-fallback: var(--memory-byte-label-color);
			/* Mix only the background: labels stay opaque and contrast-color sees the fill. */
			--byte-background: color-mix(
				in srgb,
				var(--byte-fill) calc(var(--byte-alpha) * 100%),
				var(--byte-surface)
			);
			position: relative;
			display: flex;
			min-width: 0;
			aspect-ratio: 1;
			box-sizing: border-box;
			align-items: center;
			justify-content: center;
			border-radius: 22%;
			background: var(--byte-background);
		}

		button.byte {
			padding: 0;
			border: 0;
			font: inherit;
			cursor: pointer;
		}

		button.byte:focus-visible {
			outline: var(--border-width-thick) solid var(--color-border-focus);
			outline-offset: 2px;
		}

		.byte.allocated {
			--byte-fill: var(--memory-allocated);
			--byte-label-fallback: var(--color-text-on-light-fill);
		}

		.grid.boundary-tags .byte.allocated {
			--byte-fill: var(--memory-available);
			--byte-label-fallback: var(--memory-byte-label-color);
			border: var(--border-width-thin) solid var(--memory-usable-border);
		}

		.grid.boundary-tags .byte.allocated.recently-allocated {
			border: 0;
		}

		.byte.custom-color {
			--byte-fill: var(--byte-color);
			--byte-alpha: var(--byte-opacity, 1);
		}

		/* Reserved bytes look unused; missing free-list ranges distinguish them. */
		.byte.reserved {
			--byte-fill: var(--memory-available);
		}

		.byte.metadata-size {
			--byte-fill: var(--memory-metadata-size);
			--byte-label-fallback: var(--color-text-on-light-fill);
		}

		.byte.metadata-free {
			--byte-fill: var(--memory-metadata-free);
			--byte-label-fallback: var(--color-text-on-light-fill);
		}

		.byte.metadata-allocated {
			--byte-fill: var(--color-data-fill-orange);
			--byte-label-fallback: var(--color-text-on-light-fill);
		}

		.byte.highlighted {
			scroll-margin: 4px;
		}

		.highlight-ring {
			position: absolute;
			inset: -5px;
			z-index: 2;
			width: calc(100% + 10px);
			height: calc(100% + 10px);
			overflow: visible;
			pointer-events: none;
		}

		.highlight-ring rect {
			x: 3px;
			y: 3px;
			width: calc(100% - 6px);
			height: calc(100% - 6px);
			/* The byte's 22% radius plus 2px to the ring's stroke centre. */
			rx: calc(22% - 0.2px);
			fill: none;
			stroke: var(--color-border-focus);
			stroke-width: 2px;
			/* Sixteen cycles fill the normalized 32-unit perimeter exactly. */
			stroke-dasharray: 1.1 0.9;
			animation: memory-highlight-march 900ms linear infinite;
			animation-play-state: var(--_highlight-play-state, paused);
		}

		/* Opposite start points hide each other's dash seam. */
		.highlight-ring.ring-main {
			clip-path: polygon(50% 0, 100% 0, 100% 100%, 0 100%, 0 50%, 50% 50%);
		}

		.highlight-ring.ring-seam {
			clip-path: inset(0 50% 50% 0);
		}

		.highlight-ring.ring-seam rect {
			transform: rotate(180deg);
			transform-origin: center;
		}

		@keyframes memory-highlight-march {
			to {
				stroke-dashoffset: -2;
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.highlight-ring rect {
				animation: none;
			}
		}

		.byte.recently-allocated {
			box-shadow: inset 0 0 0 var(--_recent-outline-width)
				var(--memory-text-allocated);
		}

		.byte.recently-freed {
			box-shadow: inset 0 0 0 var(--_recent-outline-width)
				var(--memory-text-free);
		}

		:host([data-theme="dark"]) .byte.recently-allocated {
			box-shadow: inset 0 0 0 var(--_recent-outline-width)
				var(--memory-recent-allocated-outline);
		}

		.byte.free-list-small,
		.byte.free-list-large {
			--range-color: var(--memory-free-list-segregated);
		}

		.range-segment {
			position: absolute;
			top: calc(50% - var(--border-width-thick) / 2);
			right: calc(var(--grid-gap) / -2);
			left: calc(var(--grid-gap) / -2);
			z-index: 1;
			height: var(--border-width-thick);
			background: var(--range-color);
			opacity: 0;
			pointer-events: none;
		}

		.byte.free-list .range-segment {
			opacity: 1;
		}

		.byte.block-start .range-segment {
			left: 50%;
		}

		.byte.block-end .range-segment {
			right: 50%;
		}

		/* Wrapped ranges stop at row edges rather than crossing the grid. */
		.grid > .byte:nth-child(16n + 1):not(.block-start) .range-segment {
			left: 0;
		}

		.grid > .byte:nth-child(16n):not(.block-end) .range-segment {
			right: 0;
		}

		.range-marker,
		.cursor-marker {
			position: absolute;
			top: 50%;
			left: 50%;
			z-index: 2;
			width: 50%;
			height: 50%;
			border-radius: 24%;
			background: var(--range-color);
			opacity: 0;
			pointer-events: none;
			transform: translate(-50%, -50%);
		}

		.byte.block-start .start-marker,
		.byte.block-end .end-marker,
		.byte.cursor .cursor-marker {
			opacity: 1;
		}

		.byte.free-list-small .range-marker {
			box-sizing: border-box;
			border: var(--border-width-thick) solid var(--range-color);
			background: var(--memory-available);
		}

		.cursor-marker {
			--range-color: var(--memory-free-list-default);
		}

		.byte-label {
			/* Isolate labels, not bytes, so labels can sit above arrows and ranges. */
			container-type: inline-size;
			position: absolute;
			inset: 0;
			z-index: 5;
			display: flex;
			align-items: center;
			justify-content: center;
			pointer-events: none;
		}

		.byte-label-text {
			/* ~0.6em per monospace glyph; fit the cell and cap at normal reading size. */
			font: var(--font-weight-bold)
				min(var(--type-ui-size), 85cqi, calc(140cqi / var(--label-length))) /
					var(--line-height-solid)
				var(--font-family-code);
			white-space: nowrap;
			color: var(
				--label-color,
				var(--label-fallback, var(--byte-label-fallback))
			);
		}

		.address-prefix {
			opacity: 0.88;
		}

		@supports (color: contrast-color(red)) {
			.byte-label-text {
				color: var(--label-color, contrast-color(var(--byte-background)));
			}
		}

		.byte:not(.allocated):not(.custom-color) .byte-label-text.address,
		.grid.boundary-tags
			.byte.allocated:not(.custom-color)
			.byte-label-text.address {
			color: color-mix(
				in oklab,
				var(--memory-byte-label-color) 60%,
				var(--color-palette-orange-foreground)
			);
		}

		.grid-wrap {
			position: relative;
		}

		.annotations {
			position: absolute;
			z-index: 4;
			inset: 0;
			width: 100%;
			height: 100%;
			overflow: visible;
			pointer-events: none;
		}

		:host([playground]) {
			--_recent-outline-width: var(--border-width-thin);
			padding: 0;
		}

		:host([playground]) .memory-body {
			width: max(var(--space-4), min(100%, var(--memory-grid-width, 100%)));
			margin-inline: auto;
			padding: 0;
		}

		:host([playground]) .grid {
			--byte-surface: var(--color-surface-workspace);
			--grid-gap: var(--border-width-thin);
			grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
		}

		:host([playground]) .call-header {
			width: calc(
				100% + var(--memory-padding, 0px) + var(--memory-padding-right, 0px)
			);
			margin-left: calc(0px - var(--memory-padding, 0px));
			flex: none;
		}

		@media (max-width: 38rem) {
			.memory-body {
				padding: var(--space-3);
			}

			.grid {
				--grid-gap: var(--space-1);
				grid-template-columns: repeat(8, minmax(0, 1fr));
			}

			.grid > .byte:nth-child(8n + 1):not(.block-start) .range-segment {
				left: 0;
			}

			.grid > .byte:nth-child(8n):not(.block-end) .range-segment {
				right: 0;
			}

			.call-header {
				--call-rail-font-size: var(--font-size-small);
			}
		}

		@media (max-width: 22rem) {
			:host([show-addresses]) .grid {
				grid-template-columns: repeat(4, minmax(0, 1fr));
			}
		}
	`;

	override connectedCallback(): void {
		this.style.removeProperty("--_highlight-play-state");
		if (!this.snapshots) {
			this.articleCalls = new ElementParser({ element: this }).parse();
			if (this.timelineReady) {
				this.rebuildTimeline();
			}
		}
		super.connectedCallback();
	}

	protected override render() {
		const timeline = this.activeTimeline;
		const snapshot = timeline[this.currentStep];
		if (
			!snapshot &&
			(this.snapshots || this.playground || this.timelineReady)
		) {
			return nothing;
		}
		const texts = new Map(snapshot?.texts?.map((text) => [text.address, text]));
		const operationLabel = snapshot
			? this.operationLabel(snapshot)
			: "Initial state";
		const callRail = this.callRailCalls();
		const header =
			!this.staticView && this.stepCount > 0
				? html`<s-call-rail
						class="call-header"
						slot=${this.playground ? nothing : "header"}
						.calls=${callRail}
						.current=${
							this.playground
								? Math.max(0, this.currentStep - 1)
								: this.currentStep - 1
						}
						@call-select=${this.handleCallSelect}
					></s-call-rail>`
				: nothing;
		// Empty cells preserve the responsive grid; labels and annotations are overlays.
		const body = html`
			<div class="memory-body">
				<div class="grid-wrap">
					<div
						class=${classMap({ grid: true, "boundary-tags": this.allocator === "boundary-tags" })}
						style=${`--columns: ${Math.max(1, this.columns)}`}
						role=${this.selectableAddresses ? "group" : "img"}
						aria-live="polite"
						aria-busy=${String(!snapshot)}
						aria-label=${snapshot ? `${operationLabel}. ${this.stateSummary(snapshot)}` : this.description}
					>
						${
							snapshot
								? snapshot.bytes.map((byte) =>
										this.renderByte(
											byte,
											snapshot.operation,
											texts.get(byte.address),
										),
									)
								: Array.from(
										{ length: this.bytes },
										() =>
											html`<span
												class="byte"
												aria-hidden="true"
											></span>`,
									)
						}
					</div>
					${snapshot ? renderMemoryAnnotations(snapshot, this.columns) : nothing}
				</div>
			</div>
		`;
		const controls =
			!this.staticView && (this.playground || this.stepCount > 0)
				? this.renderControls()
				: nothing;

		if (this.playground) {
			return html`${header}${body}${controls}`;
		}
		return html`
			<s-card
				full-width
				role="group"
				aria-label=${this.description}
			>
				${header}${body}${controls}
			</s-card>
		`;
	}

	private get activeTimeline(): Snapshot[] {
		return this.snapshots ?? this.timeline;
	}

	get slider(): Slider {
		return this.renderRoot.querySelector<TimelineControls>(
			"s-timeline-controls",
		)!.slider;
	}

	private get stepCount(): number {
		return this.snapshots || this.timelineReady
			? this.activeTimeline.length - 1
			: this.articleCalls.length;
	}

	private ensureTimeline(): void {
		if (!this.snapshots && !this.timelineReady) {
			this.rebuildTimeline();
		}
	}

	/** Allows article links and the playground to move to a specific step. */
	setStep(step: number): void {
		// Links and keyboard input need the real frames even before intersection.
		this.ensureTimeline();
		const nextStep = Math.min(
			Math.max(0, Math.round(step)),
			Math.max(0, this.activeTimeline.length - 1),
		);
		if (nextStep === this.currentStep) {
			return;
		}
		this.currentStep = nextStep;
	}

	highlightByte(address: number): void {
		if (address < 0 || address >= this.bytes) {
			return;
		}
		this.ensureTimeline();
		this.highlightedAddress = address;
		this.dataset.highlightedAddress = String(address);
	}

	async getByteElement(address: number): Promise<HTMLElement | null> {
		this.ensureTimeline();
		await this.updateComplete;
		return this.renderRoot.querySelector<HTMLElement>(
			`.byte[data-address="${address}"]`,
		);
	}

	clearByteHighlight(): void {
		this.highlightedAddress = undefined;
		delete this.dataset.highlightedAddress;
	}

	private rebuildTimeline(): void {
		this.timeline = simulateArticle(
			this.allocator,
			{
				bytes: this.bytes,
				debug: false,
				coalesce: !this.noCoalesce,
				minsize: this.minimumSize,
				smallfreelistsize: this.smallSegmentSize,
				smallfreelistthreshold: this.smallThreshold,
			},
			this.articleCalls,
		);
		this.timelineReady = true;
		this.currentStep = this.staticView ? this.timeline.length - 1 : 0;
	}

	private renderByte(
		byte: MemoryByte,
		operation?: Operation,
		annotation?: TextAnnotation,
	) {
		const hasRange = byte.freeBlockId !== undefined;
		const inRecentBlock =
			!this.staticView &&
			operation !== undefined &&
			byte.address >= operation.address &&
			byte.address < operation.address + operation.size;
		const classes = {
			byte: true,
			allocated: byte.kind === "allocated",
			"recently-allocated": inRecentBlock && operation?.kind === "malloc",
			"recently-freed": inRecentBlock && operation?.kind === "free",
			"custom-color": byte.color !== undefined,
			highlighted: byte.address === this.highlightedAddress,
			reserved: byte.kind === "reserved",
			"metadata-size": byte.kind === "metadata" && byte.metadataKind === "size",
			"metadata-free": byte.kind === "metadata" && byte.metadataKind === "free",
			"metadata-allocated":
				byte.kind === "metadata" && byte.metadataKind === "allocated",
			"free-list": hasRange,
			"free-list-small": byte.freeList === "small",
			"free-list-large": byte.freeList === "large",
			"block-start": byte.freeBlockStart ?? false,
			"block-end": byte.freeBlockEnd ?? false,
			cursor: byte.isCursor ?? false,
		};
		const customStyle =
			byte.color !== undefined && byte.color !== ""
				? `--byte-color: ${byte.color}; --byte-opacity: ${byte.opacity ?? 1};`
				: "";
		const contents = html`
			${hasRange ? html`<span class="range-segment"></span>` : nothing}
			${
				byte.address === this.highlightedAddress
					? html`<svg
								class="highlight-ring ring-main"
								aria-hidden="true"
							>
								<rect pathLength="32"></rect>
							</svg>
							<svg
								class="highlight-ring ring-seam"
								aria-hidden="true"
							>
								<rect pathLength="32"></rect>
							</svg>`
					: nothing
			}
			${
				byte.freeBlockStart
					? html`<span
							class="range-marker start-marker"
							data-marker-kind="start"
							data-list=${byte.freeList ?? "default"}
							data-block-id=${byte.freeBlockId ?? ""}
						></span>`
					: nothing
			}
			${
				byte.freeBlockEnd
					? html`<span
							class="range-marker end-marker"
							data-marker-kind="end"
							data-list=${byte.freeList ?? "default"}
							data-block-id=${byte.freeBlockId ?? ""}
						></span>`
					: nothing
			}
			${
				byte.isCursor
					? html`<span
							class="cursor-marker"
							data-marker-kind="cursor"
							data-list="cursor"
							data-block-id="cursor"
						></span>`
					: nothing
			}
			${this.renderByteLabel(byte, annotation)}
		`;
		if (this.selectableAddresses) {
			return html`<button
				class=${classMap(classes)}
				style=${customStyle}
				data-address=${String(byte.address)}
				type="button"
				aria-label=${`Address 0x${byte.address.toString(16).toUpperCase().padStart(2, "0")}`}
				aria-pressed=${String(byte.address === this.highlightedAddress)}
				@click=${() => this.selectAddress(byte.address)}
			>
				${contents}
			</button>`;
		}
		return html`<span
			class=${classMap(classes)}
			style=${customStyle}
			data-address=${String(byte.address)}
			title=${this.byteDescription(byte)}
			aria-hidden="true"
			>${contents}</span
		>`;
	}

	private selectAddress(address: number): void {
		this.highlightByte(address);
		this.dispatchEvent(new CustomEvent("address-select", { detail: address }));
	}

	private renderByteLabel(byte: MemoryByte, annotation?: TextAnnotation) {
		const isAddress =
			!annotation && byte.kind !== "metadata" && this.showAddresses;
		const text = annotation
			? annotation.text
			: byte.kind === "metadata"
				? String(byte.value)
				: this.showAddresses
					? `0x${byte.address.toString(16).toUpperCase().padStart(2, "0")}`
					: "";
		if (text === "") {
			return nothing;
		}
		const color = annotation?.color;
		// Metadata colours supplied by the examples are fallbacks. A reader's
		// explicit decorative text colour remains an override of automatic contrast.
		const colorStyle =
			color !== undefined && color !== ""
				? `${annotation?.metadataKind ? "--label-fallback" : "--label-color"}: ${color};`
				: "";
		return html`<span class="byte-label">
			<span
				class=${classMap({
					"byte-label-text": true,
					"annotation-text": annotation !== undefined,
					"metadata-value": !annotation && byte.kind === "metadata",
					address: isAddress,
				})}
				style=${`--label-length: ${text.length}; ${colorStyle}`}
				>${isAddress ? html`<span class="address-prefix">0x</span>${text.slice(2)}` : text}</span
			>
		</span>`;
	}

	private renderControls() {
		const timeline = this.activeTimeline;
		const max = this.stepCount;
		return html`<s-timeline-controls
			slot=${this.playground ? nothing : "footer"}
			?playground=${this.playground}
			.step=${this.currentStep}
			.steps=${max}
			.tickCount=${this.playground ? Math.min(max + 1, 33) : 0}
			.valueText=${
				this.playground
					? `Operation ${this.currentStep} of ${max}`
					: `Step ${this.currentStep} of ${max}: ${timeline[this.currentStep] ? this.operationLabel(timeline[this.currentStep]!) : "Initial state"}`
			}
			@step-change=${this.handleStepChange}
		></s-timeline-controls>`;
	}

	private callRailCalls(): CallRailCall[] {
		return this.activeTimeline.slice(1).map((snapshot) => ({
			label: this.operationCall(snapshot.operation!),
			kind: snapshot.operation!.kind,
		}));
	}

	private handleStepChange(event: CustomEvent<number>): void {
		this.setStep(event.detail);
	}

	private handleCallSelect(event: CustomEvent<number>): void {
		this.setStep(event.detail + 1);
	}

	private operationLabel(snapshot: Snapshot): string {
		const { operation } = snapshot;
		if (!operation) {
			return "Initial state";
		}
		const call = this.operationCall(operation);
		return operation.kind === "malloc"
			? `${call} → 0x${operation.address.toString(16)}`
			: call;
	}

	private operationCall(operation: Operation): string {
		return operation.kind === "malloc"
			? `malloc(${operation.size})`
			: `free(0x${operation.address.toString(16)})`;
	}

	private stateSummary(snapshot: Snapshot): string {
		const counts = {
			available: 0,
			allocated: 0,
			reserved: 0,
			metadata: 0,
		};
		for (const byte of snapshot.bytes) {
			counts[byte.kind] += 1;
		}
		const parts = [
			`${counts.allocated} allocated`,
			`${counts.available} available`,
		];
		if (counts.reserved > 0) {
			parts.push(`${counts.reserved} reserved`);
		}
		if (counts.metadata > 0) {
			parts.push(`${counts.metadata} metadata`);
		}
		if (snapshot.freeBlockCount > 0) {
			parts.push(`${snapshot.freeBlockCount} free-list entries`);
		}
		return `${this.bytes} bytes of memory: ${parts.join(", ")}.`;
	}

	private byteDescription(byte: MemoryByte): string {
		const address = `Byte 0x${byte.address.toString(16)}`;
		if (byte.kind === "metadata") {
			return `${address}: ${byte.metadataKind} metadata, value ${byte.value}`;
		}
		if (byte.kind === "reserved") {
			return `${address}: reserved but unused`;
		}
		if (byte.kind === "allocated") {
			return `${address}: allocated`;
		}
		const block =
			byte.freeBlockId !== undefined && byte.freeBlockId !== ""
				? `, in the ${byte.freeList} free list`
				: "";
		const cursor = byte.isCursor ? ", next allocation starts here" : "";
		return `${address}: available${block}${cursor}`;
	}
}
