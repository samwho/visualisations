import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "../../../shared/components/Card";
import "../../../shared/components/Button";
import "./Icon";
import "../../../shared/components/Slider";
import type { Slider } from "../../../shared/components/Slider";

@customElement("s-modulo-grid")
export class ModuloGrid extends LitElement {
	@property({
		converter: (value: string | null) =>
			value === null
				? Array.from({ length: 48 }, (_, index) => index)
				: value.split(",").map(Number),
	})
	nums: number[] = Array.from({ length: 48 }, (_, index) => index);

	@state() private position = 0;

	static override styles = css`
		:host {
			display: block;
		}
		.equation {
			display: block;
			text-align: center;
			padding: var(--space-2);
			font: var(--font-weight-bold)
				var(--type-ui-size) / var(--type-ui-line-height)
				var(--font-family-code, monospace);
			font-variant-numeric: tabular-nums;
		}
		.number {
			white-space: pre;
		}
		.grid {
			display: grid;
			grid-template-columns: repeat(8, minmax(0, 1fr));
		}
		.cell {
			position: relative;
			aspect-ratio: 1;
			box-shadow: inset 0 0 0 1px var(--color-border-data-cell);
		}
		.cell::before {
			content: "";
			position: absolute;
			inset: 1px;
			background: var(--color-data-fill-blue);
			/* Keep the full sequence's scale fixed while scrubbing, like the heat maps. */
			opacity: calc(var(--visits) / var(--max-visits));
			z-index: 0;
		}
		.cell.current::after {
			content: "";
			position: absolute;
			inset: 1px;
			border: 2px solid var(--color-border-default);
		}
		.footer {
			display: flex;
			align-items: center;
			gap: var(--space-3);
		}
		s-slider {
			flex: 1;
			min-width: 0;
		}
		.remainder {
			color: var(--hashing-bucket-color);
		}
	`;

	protected override render() {
		const position = Math.min(this.position, this.nums.length - 1);
		const value = this.nums[position]!;
		const remainder = value % 16;
		const digits = String(Math.max(...this.nums)).length;
		const totals = Array.from({ length: 16 }, () => 0);
		const visits = Array.from({ length: 16 }, () => 0);
		for (const [index, number] of this.nums.entries()) {
			totals[number % 16]! += 1;
			if (index <= position) {
				visits[number % 16]! += 1;
			}
		}
		return html`
			<s-card full-width>
				<output
					slot="header"
					class="equation"
					aria-live="polite"
				>
					<span class="number">${String(value).padStart(digits, " ")}</span> %
					16 =
					<span class="number remainder"
						>${String(remainder).padStart(2, " ")}</span
					>
				</output>
				<div
					class="grid"
					role="img"
					style=${`--max-visits: ${Math.max(...totals)}`}
					aria-label=${`16 squares, read left to right across each row. Square ${remainder} is highlighted, visited ${visits[remainder]} times. Brightness shows the number of visits.`}
				>
					${visits.map(
						(count, index) =>
							html`<span
								class=${index === remainder ? "cell current" : "cell"}
								style=${`--visits: ${count}`}
							></span>`,
					)}
				</div>
				<div
					slot="footer"
					class="footer"
				>
					<s-button
						appearance="filled"
						label="Back"
						.disabled=${position === 0}
						@click=${() => {
							this.position = Math.max(0, position - 1);
						}}
						><s-icon
							slot="icon"
							name="arrow_left"
							aria-hidden="true"
						></s-icon
					></s-button>
					<s-slider
						min="0"
						.max=${String(this.nums.length - 1)}
						step="1"
						label="Hash value"
						.value=${String(position)}
						.valueText=${`Input ${position + 1} of ${this.nums.length}: ${value} modulo 16 is ${remainder}`}
						@input=${(event: Event) => {
							// SAFETY: this input listener is attached directly to s-slider.
							this.position = Number((event.currentTarget as Slider).value);
						}}
					></s-slider>
					<s-button
						appearance="filled"
						label="Next"
						.disabled=${position === this.nums.length - 1}
						@click=${() => {
							this.position = Math.min(this.nums.length - 1, position + 1);
						}}
						><s-icon
							slot="icon"
							name="arrow_right"
							aria-hidden="true"
						></s-icon
					></s-button>
				</div>
			</s-card>
		`;
	}
}
