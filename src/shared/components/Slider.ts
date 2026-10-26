import { ResizeController } from "../core/controllers/ResizeController";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { AnimationController } from "../core/controllers/AnimationController";
import { MediaQueryController } from "../core/controllers/MediaQueryController";
import { customElement, property, query, state } from "lit/decorators.js";
import "./Tooltip";
import type { Tooltip } from "./Tooltip";
import { ifDefined } from "lit/directives/if-defined.js";

@customElement("s-slider")
export class Slider extends LitElement {
	static override shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	@property({ type: String, reflect: true })
	min = "0";

	@property({ type: String, reflect: true })
	max = "100";

	@property({ type: String, reflect: true })
	step = "1";

	/** Optional arrow-key increment; pointer input still uses the native step. */
	@property({ type: Number, attribute: "keyboard-step" })
	keyboardStep = 0;

	@property({ type: String, reflect: true })
	value = "50";

	@property({ type: Boolean })
	disabled = false;

	/** End the track at the thumb centres at minimum and maximum. */
	@property({ type: Boolean, reflect: true, attribute: "inset-track" })
	insetTrack = false;

	/** Shows a mark for every valid step in the slider's range. */
	@property({ type: Boolean, reflect: true })
	ticks = false;

	/** Optional number of evenly spaced marks, independent of the input step. */
	@property({ type: Number, attribute: "tick-count" })
	tickCount = 0;

	/** Optional whitespace-separated values to mark instead of evenly spaced ticks. */
	@property({ type: String, attribute: "tick-values" })
	tickValues = "";

	@property({ type: Boolean, attribute: "show-tooltip" })
	showTooltip = false;

	@property({ attribute: false })
	tooltipFormatter: (value: number) => string = String;

	@property({ attribute: "tooltip-font-family" })
	tooltipFontFamily = "";

	@state() private dragging = false;

	@query("s-tooltip") private tooltip?: Tooltip;

	private tooltipFrame?: number;

	/** Accessible name forwarded to the focusable native range input. */
	@property({ type: String })
	label = "";

	/** Optional visible label, associated with the native control in this shadow root. */
	@property({ type: String, reflect: true, attribute: "visible-label" })
	visibleLabel = "";

	/** Disable keyboard movement animation for synchronised visualisations. */
	@property({ type: Boolean, reflect: true })
	immediate = false;

	/** Optional human-readable value forwarded to the native range input. */
	@property({ type: String, attribute: "value-text" })
	valueText = "";

	@query("input")
	private input!: HTMLInputElement;

	@query(".thumb-rail")
	private thumbRail!: HTMLSpanElement;

	@query(".thumb-position") private thumbPosition!: HTMLSpanElement;

	@query(".track-fill") private trackFill!: HTMLSpanElement;

	private readonly animations = new AnimationController(this);

	private readonly reducedMotion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private pendingMotion?: {
		value?: string;
		thumb: string;
		fill: string;
		duration: number;
		easing: string;
	};

	constructor() {
		super();
		this.reducedMotion.addEventListener("change", () => {
			if (this.reducedMotion.matches) {
				this.pendingMotion = undefined;
				this.animations.cancelAnimations();
			}
		});
		const resize = new ResizeController(this, () => this.thumbRail);
		resize.addEventListener("resize", (event) => {
			// SAFETY: ResizeController forwards its ResizeObserverEntry.
			const { contentRect } = (event as CustomEvent<ResizeObserverEntry>)
				.detail;
			this.pendingMotion = undefined;
			this.animations.cancelAnimations();
			this.thumbRail.style.setProperty(
				"--rail-travel",
				`${contentRect.width}px`,
			);
		});
	}

	private activePointerId: number | null = null;

	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}

		.control-label {
			display: block;
			margin-bottom: var(--control-label-gap, var(--space-2));
		}

		.slider {
			position: relative;
			height: var(--control-min-height-small);
		}

		.slider.disabled {
			opacity: var(--opacity-disabled);
		}

		.thumb-rail {
			position: absolute;
			top: 0;
			right: calc(var(--control-min-height-small) / 2);
			bottom: 0;
			left: calc(var(--control-min-height-small) / 2);
			z-index: 2;
			pointer-events: none;
		}

		.thumb-position {
			position: absolute;
			/* Avoid page overflow from a translated full-width box. */
			inset: 0 auto 0 0;
			width: 0;
			transform: translateX(
				calc(var(--progress, 0.5) * var(--rail-travel, 0px))
			);
		}

		.thumb {
			position: absolute;
			top: 50%;
			left: 0;
			width: var(--control-min-height-small);
			height: var(--control-min-height-small);
			border-radius: var(--radius-circle);
			background: var(--color-action-accent);
			transform: translate(-50%, -50%);
			transition: transform var(--motion-duration-playful)
				var(--motion-ease-bounce);
		}

		.track-rail {
			position: absolute;
			top: calc(50% - var(--space-1) / 2);
			right: 0;
			left: 0;
			height: var(--space-1);
			overflow: hidden;
			border-radius: calc(var(--space-1) / 2);
			background: var(--color-track-neutral);
			pointer-events: none;
		}

		:host([inset-track]) .track-rail {
			left: calc(var(--control-min-height-small) / 2);
			right: calc(var(--control-min-height-small) / 2);
		}

		.track-fill {
			display: block;
			width: 100%;
			height: 100%;
			background: var(--color-action-accent);
			transform: scaleX(var(--progress, 0.5));
			transform-origin: left;
		}

		.ticks {
			position: absolute;
			top: 0;
			right: calc(var(--control-min-height-small) / 2);
			bottom: 0;
			left: calc(var(--control-min-height-small) / 2);
			z-index: 0;
			pointer-events: none;
		}

		.tick {
			position: absolute;
			top: 50%;
			left: var(--tick-position);
			width: var(--border-width-thick);
			height: var(--space-3);
			border-radius: var(--border-width-thick);
			background: var(--color-track-neutral);
			transform: translate(-50%, -50%);
		}

		.tick.active {
			background: var(--color-action-accent);
		}

		input {
			-webkit-tap-highlight-color: transparent;
			position: relative;
			z-index: 1;
			width: 100%;
			height: var(--control-min-height-small);
			display: block;
			-webkit-appearance: none;
			-moz-appearance: none;
			appearance: none;
			background: transparent;
			border: none;
			margin: 0;
			padding: 0;
			box-sizing: border-box;
			cursor: pointer;
		}

		input:disabled {
			cursor: not-allowed;
		}

		input::-webkit-slider-runnable-track {
			height: var(--space-1);
			background: transparent;
		}

		input::-moz-range-track {
			height: var(--space-1);
			background: transparent;
		}

		input::-moz-range-progress {
			height: var(--space-1);
			background: transparent;
		}

		input[type="range" i]::-webkit-slider-thumb {
			height: var(--control-min-height-small);
			width: var(--control-min-height-small);
			aspect-ratio: 1;
			border-radius: var(--radius-circle);
			background: transparent;
			margin-top: calc((var(--space-1) - var(--control-min-height-small)) / 2);
			-webkit-appearance: none;
			appearance: none;
			box-shadow: none;
		}

		input[type="range"]::-moz-range-thumb {
			height: var(--control-min-height-small);
			width: var(--control-min-height-small);
			aspect-ratio: 1;
			border-radius: var(--radius-circle);
			background: transparent;
			border: none;
			-webkit-appearance: none;
			appearance: none;
			box-shadow: none;
		}

		:host([dragging]) .thumb {
			transform: translate(-50%, -50%) scale(1.12);
			transition: transform var(--motion-duration-press) var(--motion-ease-out);
		}

		@media (prefers-reduced-motion: reduce) {
			.thumb,
			:host([dragging]) .thumb {
				transition: none;
			}

			.thumb,
			:host([dragging]) .thumb {
				transform: translate(-50%, -50%);
			}
		}
	`;

	override render() {
		const ticks = this.ticks ? this.tickPositions() : [];
		const progress = this.progressPercentage();
		return html`
			${
				this.visibleLabel
					? html`<label
							class="control-label"
							part="label"
							for="control"
							>${this.visibleLabel}</label
						>`
					: nothing
			}
			<div
				class=${this.disabled ? "slider disabled" : "slider"}
				style=${`--progress: ${progress / 100}`}
			>
				<span
					class="track-rail"
					aria-hidden="true"
				>
					<span class="track-fill"></span>
				</span>
				${
					ticks.length > 0
						? html`<span
								class="ticks"
								aria-hidden="true"
							>
								${ticks.map(
									(position) =>
										html`<span
											class=${position <= progress ? "tick active" : "tick"}
											style=${`--tick-position: ${position}%`}
										></span>`,
								)}
							</span>`
						: nothing
				}
				<input
					id="control"
					type="range"
					.min=${this.min}
					.max=${this.max}
					.step=${this.step}
					.value=${this.value}
					?disabled=${this.disabled}
					aria-label=${ifDefined(this.label && this.label !== this.visibleLabel ? this.label : undefined)}
					aria-valuetext=${ifDefined(this.valueText || (this.showTooltip ? this.tooltipFormatter(Number(this.value)) : undefined))}
					@keydown=${this.handleKeyDown}
					@keyup=${() => {
						this.pendingMotion = undefined;
					}}
					@blur=${this.stopDragging}
					@input=${this.handleInput}
					@change=${this.handleChange}
					@pointerdown=${this.handlePointerDown}
				/>
				<span
					class="thumb-rail"
					aria-hidden="true"
				>
					<span class="thumb-position">
						${
							this.showTooltip
								? html`<s-tooltip
										trigger="controlled"
										placement="top"
										.text=${this.tooltipFormatter(Number(this.value))}
										.fontFamily=${this.tooltipFontFamily}
										.open=${this.dragging && !this.disabled}
										><span class="thumb"></span
									></s-tooltip>`
								: html`<span class="thumb"></span>`
						}
					</span>
				</span>
			</div>
		`;
	}

	protected override updated(changed: PropertyValues<this>): void {
		if (this.disabled) {
			this.stopDragging();
		}
		if (this.showTooltip && this.dragging && this.tooltipFrame === undefined) {
			this.tooltipFrame = requestAnimationFrame(this.trackTooltip);
		}
		if (
			!changed.has("value") &&
			!changed.has("min") &&
			!changed.has("max") &&
			!changed.has("disabled") &&
			!changed.has("immediate")
		) {
			return;
		}
		const motion = this.pendingMotion;
		this.pendingMotion = undefined;
		this.animations.cancelAnimations();
		if (
			!motion ||
			motion.value !== this.value ||
			!this.isConnected ||
			this.disabled ||
			this.immediate ||
			this.reducedMotion.matches ||
			!Number.isFinite(motion.duration)
		) {
			return;
		}
		const options = { duration: motion.duration, easing: motion.easing };
		for (const [element, from] of [
			[this.thumbPosition, motion.thumb],
			[this.trackFill, motion.fill],
		] as const) {
			this.animations.trackAnimation(
				element.animate(
					[
						{ transform: from },
						{ transform: getComputedStyle(element).transform },
					],
					options,
				),
			);
		}
	}

	/** Animate the next matching value update, such as one requested by an adjacent-step button. */
	animateValueChange(value: string): void {
		this.captureMotion();
		if (this.pendingMotion) {
			this.pendingMotion.value = value;
		}
	}

	private captureMotion(): void {
		if (this.immediate || this.reducedMotion.matches) {
			return;
		}
		const style = getComputedStyle(this);
		const duration = style.getPropertyValue("--motion-duration-move").trim();
		this.pendingMotion = {
			thumb: getComputedStyle(this.thumbPosition).transform,
			fill: getComputedStyle(this.trackFill).transform,
			duration:
				Number.parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000),
			easing: style.getPropertyValue("--motion-ease-out").trim(),
		};
	}

	private handleKeyDown = (event: KeyboardEvent) => {
		if (this.disabled || event.altKey || event.ctrlKey || event.metaKey) {
			return;
		}
		if (
			![
				"ArrowRight",
				"ArrowUp",
				"ArrowLeft",
				"ArrowDown",
				"Home",
				"End",
				"PageUp",
				"PageDown",
			].includes(event.key)
		) {
			return;
		}
		if (!this.immediate && !this.reducedMotion.matches) {
			this.captureMotion();
		}
		if (this.keyboardStep <= 0) {
			return;
		}
		const direction = {
			ArrowRight: 1,
			ArrowUp: 1,
			ArrowLeft: -1,
			ArrowDown: -1,
		}[event.key];
		if (direction === undefined) {
			return;
		}
		event.preventDefault();
		const steps = Math.max(
			1,
			Math.round(this.keyboardStep / Number(this.step)),
		);
		const previous = this.input.value;
		this.input.stepUp(direction * steps);
		if (this.input.value !== previous) {
			this.input.dispatchEvent(
				new Event("input", { bubbles: true, composed: true }),
			);
			this.input.dispatchEvent(new Event("change", { bubbles: true }));
		}
	};

	private handleInput = () => {
		this.value = this.input.value;
		if (this.pendingMotion) {
			this.pendingMotion.value = this.value;
		}
	};

	private handleChange = () => {
		this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	};

	private handlePointerDown = (event: PointerEvent) => {
		if (this.disabled || !event.isPrimary || event.button !== 0) {
			return;
		}
		this.pendingMotion = undefined;
		this.animations.cancelAnimations();
		this.activePointerId = event.pointerId;
		this.dragging = true;
		this.toggleAttribute("dragging", true);
		window.addEventListener("blur", this.stopDragging);
		window.addEventListener("pointerup", this.handlePointerEnd);
		window.addEventListener("pointercancel", this.handlePointerEnd);
	};

	private handlePointerEnd = (event: PointerEvent) => {
		if (event.pointerId !== this.activePointerId) {
			return;
		}
		this.stopDragging();
	};

	private readonly trackTooltip = (): void => {
		this.tooltipFrame = undefined;
		if (!this.showTooltip || !this.dragging || !this.isConnected) {
			return;
		}
		this.tooltip?.updatePosition();
		this.tooltipFrame = requestAnimationFrame(this.trackTooltip);
	};

	private readonly stopDragging = (): void => {
		this.dragging = false;
		if (this.tooltipFrame !== undefined) {
			cancelAnimationFrame(this.tooltipFrame);
			this.tooltipFrame = undefined;
		}
		window.removeEventListener("blur", this.stopDragging);
		this.activePointerId = null;
		this.removeAttribute("dragging");
		window.removeEventListener("pointerup", this.handlePointerEnd);
		window.removeEventListener("pointercancel", this.handlePointerEnd);
	};

	override disconnectedCallback(): void {
		this.pendingMotion = undefined;
		super.disconnectedCallback();
		this.stopDragging();
	}

	private progressPercentage(): number {
		const min = this.parseNumberOrDefault(this.min, 0);
		const max = this.parseNumberOrDefault(this.max, 100);
		const value = this.parseNumberOrDefault(this.value, min);
		const range = max - min;
		const progress = range <= 0 ? 0 : (value - min) / range;
		return Math.min(1, Math.max(0, progress)) * 100;
	}

	private tickPositions(): number[] {
		if (this.tickCount > 1) {
			return Array.from(
				{ length: this.tickCount },
				(_, index) => (index * 100) / (this.tickCount - 1),
			);
		}

		const min = this.parseNumberOrDefault(this.min, 0);
		const max = this.parseNumberOrDefault(this.max, 100);
		const range = max - min;
		if (range <= 0) {
			return [];
		}
		if (this.tickValues.trim()) {
			return this.tickValues
				.trim()
				.split(/\s+/)
				.map(Number)
				.filter(
					(value) => Number.isFinite(value) && value >= min && value <= max,
				)
				.map((value) => ((value - min) * 100) / range);
		}
		const step = this.parseNumberOrDefault(this.step, 0);
		if (step <= 0) {
			return [];
		}

		const tickCount = Math.floor(range / step) + 1;
		return Array.from(
			{ length: tickCount },
			(_, index) => (index * step * 100) / range,
		);
	}

	private parseNumberOrDefault(value: string, fallback: number) {
		const parsed = Number.parseFloat(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}
}
