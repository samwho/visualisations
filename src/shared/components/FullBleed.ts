import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

/** Extends a background to the viewport edges without widening its content. */
@customElement("s-full-bleed")
export class FullBleed extends LitElement {
	static override styles = css`
		:host {
			--inline-code-background: var(--color-surface-page);
			--inline-code-foreground: var(--color-text-code);
			display: block;
			position: relative;
			isolation: isolate;
		}

		:host::before {
			content: "";
			position: absolute;
			inset: 0;
			z-index: -1;
			pointer-events: none;
			background: var(--color-surface-band);
			/* Ink overflow avoids 100vw scrollbars; clip decoration, not content or focus. */
			box-shadow: 0 0 0 100vmax var(--color-surface-band);
			clip-path: inset(0 -100vmax);
		}
	`;

	protected override render() {
		return html`<slot></slot>`;
	}
}
