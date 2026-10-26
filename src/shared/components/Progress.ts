import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("s-progress")
export class Progress extends LitElement {
	@property({ type: Number }) value = 0;

	@property({ type: Number }) max = 1;

	@property() label = "";

	static override styles = css`
		:host {
			display: block;
			width: 100%;
			height: var(--progress-height, var(--space-2));
			position: relative;
		}
		progress {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
		}
		.track {
			height: 100%;
			border-radius: var(--radius-pill);
			overflow: clip;
			background: var(--color-progress-track);
		}
		.fill {
			width: 100%;
			height: 100%;
			transform-origin: left center;
			background: var(--color-progress-fill);
		}
	`;

	protected override render() {
		const max = this.max > 0 ? this.max : 1;
		const fraction = Math.min(1, Math.max(0, this.value / max));
		return html`
			<progress
				value=${this.value}
				max=${max}
				aria-label=${this.label}
			></progress>
			<div
				class="track"
				part="track"
				aria-hidden="true"
			>
				<div
					class="fill"
					part="fill"
					style="transform: scaleX(${fraction})"
				></div>
			</div>
		`;
	}
}
