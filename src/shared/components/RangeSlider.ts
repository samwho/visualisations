import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { Slider } from "./Slider";
import type { Tooltip } from "./Tooltip";

@customElement("s-range-slider")
export class RangeSlider extends LitElement {
	static override shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	@property({ reflect: true }) min = "0";

	@property({ reflect: true }) max = "100";

	@property({ reflect: true }) step = "1";

	@property({ attribute: false }) value: [number, number] = [0, 100];

	@property({ type: Boolean }) disabled = false;

	@property() label = "";

	@property({ attribute: "visible-label", reflect: true }) visibleLabel = "";

	@property({ type: Boolean, attribute: "show-tooltip" }) showTooltip = false;

	@property({ attribute: false }) tooltipFormatter: (value: number) => string =
		String;

	@property({ attribute: "tooltip-font-family" }) tooltipFontFamily = "";

	@state() private dragging: number | null = null;

	private pointerId: number | null = null;

	private tooltipFrame?: number;

	static override styles = [
		Slider.styles,
		css`
			input {
				position: absolute;
				inset: 0;
				/* Partition transparent hit areas, not the visible thumbs or track. */
				clip-path: inset(0 var(--clip-right, 0%) 0 var(--clip-left, 0%));
			}
			input:focus-visible {
				outline: none;
			}
			.endpoint:has(input:focus-visible) .thumb {
				outline: var(--border-width-thick) solid var(--focus-ring-color);
				outline-offset: var(--space-1);
			}
			.thumb-position {
				left: var(--position);
				transform: none;
			}
			.endpoint.dragging .thumb {
				transform: translate(-50%, -50%) scale(1.12);
				transition: transform var(--motion-duration-press)
					var(--motion-ease-out);
			}
			.track-fill {
				position: absolute;
				left: var(--lower-position);
				width: calc(var(--upper-position) - var(--lower-position));
				transform: none;
			}
			@media (prefers-reduced-motion: reduce) {
				.endpoint.dragging .thumb {
					transform: translate(-50%, -50%);
					transition: none;
				}
			}
		`,
	];

	protected override willUpdate(): void {
		const lower = this.snap(this.value[0]);
		const upper = this.snap(this.value[1]);
		if (lower !== this.value[0] || upper !== this.value[1] || lower > upper) {
			this.value = [Math.min(lower, upper), Math.max(lower, upper)];
		}
	}

	private snap(value: number): number {
		const min = Number(this.min);
		const max = Number(this.max);
		const step = Number(this.step);
		const bounded = Math.max(min, Math.min(max, value));
		if (this.step === "any") {
			return bounded;
		}
		const index = Math.max(
			0,
			Math.min(
				Math.floor((max - min) / step + 1e-10),
				Math.round((bounded - min) / step),
			),
		);
		return Number((min + index * step).toPrecision(12));
	}

	protected override render() {
		const min = Number(this.min);
		const span = Number(this.max) - min;
		const positions = this.value.map((value) =>
			span > 0 ? ((value - min) / span) * 100 : 0,
		);
		// Native range thumbs travel within half a thumb's inset at each end.
		const trackPosition = (percent: number) =>
			`calc(${percent}% + var(--control-min-height-small) * ${0.5 - percent / 100})`;

		const split = trackPosition((positions[0]! + positions[1]!) / 2);
		const name = this.label || this.visibleLabel || "Range";
		return html`
			${
				this.visibleLabel
					? html`<label
							class="control-label"
							part="label"
							for="lower"
							>${this.visibleLabel}</label
						>`
					: nothing
			}
			<div
				class=${this.disabled ? "slider disabled" : "slider"}
				style=${`--lower-position: ${trackPosition(positions[0]!)}; --upper-position: ${trackPosition(positions[1]!)}`}
			>
				<span
					class="track-rail"
					aria-hidden="true"
					><span class="track-fill"></span
				></span>
				${this.value.map(
					(value, index) => html`
						<div
							class=${this.dragging === index ? "endpoint dragging" : "endpoint"}
						>
							<input
								id=${index === 0 ? "lower" : "upper"}
								type="range"
								.min=${this.min}
								.max=${this.max}
								.step=${this.step}
								.value=${String(value)}
								?disabled=${this.disabled}
								style=${index === 0 ? `--clip-right: calc(100% - ${split})` : `--clip-left: ${split}`}
								aria-label=${`${name}: ${index === 0 ? "minimum" : "maximum"}`}
								aria-valuetext=${this.tooltipFormatter(value)}
								@input=${(event: Event) => this.handleInput(event, index)}
								@change=${this.handleChange}
								@keydown=${(event: KeyboardEvent) => this.handleKeyDown(event, index)}
								@keyup=${this.stopDragging}
								@blur=${() => {
									if (this.dragging === index) {
										this.stopDragging();
									}
								}}
								@pointerdown=${(event: PointerEvent) => this.handlePointerDown(event, index)}
							/>
							<span
								class="thumb-rail"
								aria-hidden="true"
							>
								<span
									class="thumb-position"
									style=${`--position: ${positions[index]}%`}
								>
									${
										this.showTooltip
											? html`<s-tooltip
													trigger="controlled"
													placement="top"
													.text=${this.tooltipFormatter(value)}
													.fontFamily=${this.tooltipFontFamily}
													.open=${!this.disabled && this.dragging === index}
													><span class="thumb"></span
												></s-tooltip>`
											: html`<span class="thumb"></span>`
									}
								</span>
							</span>
						</div>
					`,
				)}
			</div>
		`;
	}

	private handleInput(event: Event, index: number): void {
		if (!(event.currentTarget instanceof HTMLInputElement)) {
			return;
		}
		const next = Number(event.currentTarget.value);
		// Push the other endpoint on contact; reversing leaves it at its new extreme.
		this.value =
			index === 0
				? [next, Math.max(next, this.value[1])]
				: [Math.min(next, this.value[0]), next];
		event.currentTarget.value = String(this.value[index]);
	}

	private readonly handleChange = (): void => {
		this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	};

	private handleKeyDown(event: KeyboardEvent, index: number): void {
		if (event.altKey || event.ctrlKey || event.metaKey || this.disabled) {
			return;
		}
		if (
			[
				"ArrowLeft",
				"ArrowRight",
				"ArrowUp",
				"ArrowDown",
				"Home",
				"End",
				"PageUp",
				"PageDown",
			].includes(event.key)
		) {
			this.dragging = index;
		}
		if (event.key !== "Home" && event.key !== "End") {
			return;
		}
		if (!(event.currentTarget instanceof HTMLInputElement)) {
			return;
		}
		event.preventDefault();
		const input = event.currentTarget;
		input.value = event.key === "Home" ? this.min : this.max;
		if (Number(input.value) === this.value[index]) {
			return;
		}
		input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
	}

	private handlePointerDown(event: PointerEvent, index: number): void {
		if (this.disabled || !event.isPrimary || event.button !== 0) {
			return;
		}
		this.pointerId = event.pointerId;
		this.dragging = index;
		window.addEventListener("pointerup", this.handlePointerEnd);
		window.addEventListener("pointercancel", this.handlePointerEnd);
		window.addEventListener("blur", this.stopDragging);
	}

	private readonly handlePointerEnd = (event: PointerEvent): void => {
		if (event.pointerId === this.pointerId) {
			this.stopDragging();
		}
	};

	private readonly stopDragging = (): void => {
		this.dragging = null;
		this.pointerId = null;
		window.removeEventListener("pointerup", this.handlePointerEnd);
		window.removeEventListener("pointercancel", this.handlePointerEnd);
		window.removeEventListener("blur", this.stopDragging);
	};

	protected override updated(_changed: PropertyValues<this>): void {
		if (this.disabled) {
			this.stopDragging();
		}
		if (
			this.showTooltip &&
			this.dragging !== null &&
			this.tooltipFrame === undefined
		) {
			this.tooltipFrame = requestAnimationFrame(this.trackTooltips);
		}
	}

	private readonly trackTooltips = (): void => {
		this.tooltipFrame = undefined;
		if (
			!this.isConnected ||
			this.disabled ||
			!this.showTooltip ||
			this.dragging === null
		) {
			return;
		}
		for (const tooltip of this.renderRoot.querySelectorAll<Tooltip>(
			"s-tooltip",
		)) {
			tooltip.updatePosition();
		}
		this.tooltipFrame = requestAnimationFrame(this.trackTooltips);
	};

	override disconnectedCallback(): void {
		this.stopDragging();
		if (this.tooltipFrame !== undefined) {
			cancelAnimationFrame(this.tooltipFrame);
		}
		this.tooltipFrame = undefined;
		super.disconnectedCallback();
	}
}
