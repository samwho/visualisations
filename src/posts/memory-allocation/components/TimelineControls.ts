import { LitElement, css, html, type PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import type { Slider } from "../../../shared/components/Slider";
import "../../../shared/components/Button";
import "../../../shared/components/Slider";
import "./Icon";

@customElement("s-timeline-controls")
export class TimelineControls extends LitElement {
	@property({ type: Number }) step = 0;

	@property({ type: Number }) steps = 0;

	@property({ type: Boolean, reflect: true }) playground = false;

	@property({ type: Number, attribute: "tick-count" }) tickCount = 0;

	@property({ type: String, attribute: "value-text" }) valueText = "";

	@query("s-slider") readonly slider!: Slider;

	private inputPosition?: { value: number; step: number };

	protected override willUpdate(changed: PropertyValues<this>): void {
		// Keep the exact drag fraction when it rounds to an operation. A parent
		// selecting another operation or replacing the timeline invalidates it.
		if (changed.has("steps") || this.inputPosition?.step !== this.step) {
			this.inputPosition = undefined;
		}
	}

	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}

		.controls {
			display: grid;
			grid-template-columns: max-content max-content minmax(0, 1fr) max-content;
			box-sizing: border-box;
			align-items: center;
			gap: var(--space-2);
		}

		:host([playground]) {
			width: 100cqw;
			max-width: 100cqw;
			padding-top: var(--space-3);
		}

		s-slider {
			min-width: 0;
		}
	`;

	get progress(): number {
		return this.steps === 0 ? 0 : this.step / this.steps;
	}

	override render() {
		return html`
			<div class="controls">
				<s-button
					size="lg"
					class="reset"
					label="Reset visualization"
					?disabled=${this.step === 0}
					@click=${() => this.selectStep(0)}
				>
					<s-icon
						slot="icon"
						name="arrow_counterclockwise"
					></s-icon>
				</s-button>
				<s-button
					size="lg"
					label="Previous operation"
					?disabled=${this.step === 0}
					@click=${() => this.selectAdjacentStep(-1)}
				>
					<s-icon
						slot="icon"
						name="arrow_left"
					></s-icon>
				</s-button>
				<s-slider
					ticks
					min="0"
					max=${this.playground ? "1" : String(this.steps)}
					step=${
						this.playground ? String(1 / Math.max(1, this.tickCount - 1)) : "1"
					}
					.tickCount=${this.tickCount}
					.value=${String(this.playground ? (this.inputPosition?.value ?? this.progress) : this.step)}
					label="Allocation timeline"
					.valueText=${this.valueText}
					@input=${this.handleSliderInput}
				></s-slider>
				<s-button
					size="lg"
					label="Next operation"
					?disabled=${this.step === this.steps}
					@click=${() => this.selectAdjacentStep(1)}
				>
					<s-icon
						slot="icon"
						name="arrow_right"
					></s-icon>
				</s-button>
			</div>
		`;
	}

	private handleSliderInput(event: Event): void {
		// SAFETY: handleSliderInput is bound directly to this template's s-slider.
		const value = Number((event.currentTarget as Slider).value);
		this.selectStep(
			this.playground ? Math.round(value * this.steps) : value,
			this.playground ? value : undefined,
		);
	}

	private selectAdjacentStep(direction: number): void {
		const step = Math.min(Math.max(0, this.step + direction), this.steps);
		if (step === this.step) {
			return;
		}
		this.slider.animateValueChange(
			String(this.playground ? step / this.steps : step),
		);
		this.selectStep(step);
	}

	private selectStep(step: number, inputValue?: number): void {
		step = Math.min(Math.max(0, step), this.steps);
		this.inputPosition =
			inputValue === undefined ? undefined : { value: inputValue, step };
		this.dispatchEvent(
			new CustomEvent<number>("step-change", {
				detail: step,
				bubbles: true,
				composed: true,
			}),
		);
	}
}
