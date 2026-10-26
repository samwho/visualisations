import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import tortoise from "../../../static/images/icons/framework7/tortoise.svg";
import hare from "../../../static/images/icons/framework7/hare.svg";
import "./Slider";
import type { Slider } from "./Slider";

@customElement("s-speed-slider")
export class SpeedSlider extends LitElement {
	static override shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	@property({ reflect: true }) min = "0.1";

	@property({ reflect: true }) max = "3.0";

	@property({ reflect: true }) value = "1";

	@property({ type: Boolean }) disabled = false;

	@property() label = "Simulation speed";

	@query("s-slider") private slider!: Slider;

	private readonly formatSpeed = (value: number): string =>
		`${value.toFixed(1)}x`;

	static override styles = css`
		:host {
			display: grid;
			min-width: 0;
			grid-template-columns: max-content minmax(0, 1fr) max-content;
			gap: var(--space-2);
			align-items: center;
		}
		.icon {
			display: block;
			height: var(--icon-size-medium);
		}
		svg {
			display: block;
			width: auto;
			height: 100%;
			fill: currentColor;
		}
	`;

	// Preserve the composed input/change events after synchronising the wrapper's value.
	private readonly syncValue = (): void => {
		this.value = this.slider.value;
	};

	protected override render() {
		return html`
			<span
				class="icon"
				role="img"
				aria-label="Slow"
				>${unsafeSVG(tortoise)}</span
			>
			<s-slider
				.min=${this.min}
				.max=${this.max}
				step="any"
				.value=${this.value}
				.disabled=${this.disabled}
				.label=${this.label}
				.valueText=${`${Number(this.value).toFixed(1)} times speed`}
				ticks
				tick-values="1"
				show-tooltip
				.tooltipFormatter=${this.formatSpeed}
				tooltip-font-family="var(--font-family-code, ui-monospace, monospace)"
				@input=${this.syncValue}
				@change=${this.syncValue}
			></s-slider>
			<span
				class="icon"
				role="img"
				aria-label="Fast"
				>${unsafeSVG(hare)}</span
			>
		`;
	}
}
