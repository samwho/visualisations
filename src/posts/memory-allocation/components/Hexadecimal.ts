import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Slider } from "../../../shared/components/Slider";

@customElement("s-hexadecimal")
export class Hexadecimal extends LitElement {
	@property({ type: Number }) max = 32;

	@state() value = 0;

	setValue(value: number): void {
		if (value < 0 || value > this.max || !Number.isInteger(value)) {
			return;
		}
		this.value = value;
		this.dispatchEvent(new CustomEvent("number-change", { detail: value }));
	}

	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}

		.values {
			display: grid;
			grid-template-columns: 1fr auto 1fr;
			gap: var(--space-4);
			align-items: center;
			padding: var(--space-5) var(--space-4);
			font: var(--font-weight-bold)
				clamp(var(--font-size-large), 7vw, var(--font-size-xxlarge))/
					var(--line-height-solid)
				var(--font-family-code);
		}

		.decimal {
			text-align: right;
		}

		.hexadecimal {
			color: var(--memory-text-allocated);
			text-align: left;
		}

		.footer {
			width: 100%;
		}
	`;

	protected override render() {
		return html`
			<s-card
				full-width
				role="group"
				aria-label="Decimal and hexadecimal converter"
			>
				<output
					class="values"
					aria-live="polite"
				>
					<code class="decimal">${this.value}</code>
					<span aria-hidden="true">=</span>
					<code class="hexadecimal">0x${this.value.toString(16)}</code>
				</output>
				<div
					slot="footer"
					class="footer"
				>
					<s-slider
						ticks
						min="0"
						max=${String(this.max)}
						step="1"
						.value=${String(this.value)}
						label="Number to convert"
						.valueText=${`${this.value} decimal, 0x${this.value.toString(16)} hexadecimal`}
						@input=${this.handleInput}
					></s-slider>
				</div>
			</s-card>
		`;
	}

	private handleInput(event: Event): void {
		// SAFETY: handleInput is bound directly to this template's s-slider.
		const value = Number.parseFloat((event.currentTarget as Slider).value);
		if (Number.isFinite(value)) {
			this.setValue(value);
		}
	}
}
