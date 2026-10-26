import { css, html, LitElement } from "lit";
import { ResizeController } from "../core/controllers/ResizeController";
import { customElement, state } from "lit/decorators.js";

/** A bordered surface; `sticky` keeps its header/footer at the scrollport edges. */
@customElement("s-card")
export class Card extends LitElement {
	@state()
	private hasBody = false;

	constructor() {
		super();
		const resize = new ResizeController(
			this,
			() => this.renderRoot.querySelector(".body") ?? undefined,
		);
		resize.addEventListener("resize", (event) => {
			// Measure the body, not the header, so separator changes cannot feed back.
			// SAFETY: ResizeController forwards its ResizeObserverEntry.
			const { contentRect } = (event as CustomEvent<ResizeObserverEntry>)
				.detail;
			this.hasBody = contentRect.height > 0;
		});
	}

	static override styles = css`
		:host {
			--container-max-width: var(--layout-panel-max-width);
			display: block;
			width: 100%;
			max-width: min(100%, var(--container-max-width));
			margin-inline: auto;
		}

		:host([full-width]) {
			max-width: none;
		}

		.container {
			box-sizing: border-box;
			overflow: clip;
			border: var(--border-width-thin) solid var(--color-border-subtle);
			border-radius: var(--radius-large);
			background: var(--color-surface-panel);
		}

		:host([stretch]) {
			display: grid;
		}

		:host([stretch]) .container {
			display: flex;
			flex-direction: column;
		}

		:host([stretch]) .main {
			display: flex;
			flex: 1;
			flex-direction: column;
		}

		:host([stretch]) .body {
			display: grid;
			flex: 1;
		}

		/* A fixed-height workspace scrolls its body, keeping tape and controls in view. */
		:host([workspace]) {
			height: 100%;
			min-height: 0;
		}

		:host([workspace]) .container {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: minmax(0, 1fr) auto;
			height: 100%;
			border-radius: 0;
		}

		:host([workspace]) .main {
			display: grid;
			grid-template-rows: auto minmax(0, 1fr);
			min-height: 0;
		}

		:host([workspace]) .body {
			min-height: 0;
			overflow: auto;
			overscroll-behavior: contain;
		}

		:host([sticky]) ::slotted([slot="header"]),
		:host([sticky]) slot[name="footer"]::slotted(*) {
			position: sticky;
			z-index: var(--layer-sticky);
			background: var(--color-surface-panel);
		}

		:host([sticky]) ::slotted([slot="header"]) {
			top: var(--card-sticky-top, 0px);
		}

		:host([sticky]) slot[name="footer"]::slotted(*) {
			bottom: 0;
		}

		.body {
			display: flow-root;
			box-sizing: border-box;
			border-radius: 0;
			background: var(--color-surface-default);
		}

		::slotted([slot="header"]),
		slot[name="footer"]::slotted(*) {
			--inline-code-background: var(--color-surface-page);
			--inline-code-foreground: var(--color-text-code);
		}

		::slotted([slot="header"]) {
			box-sizing: border-box;
			width: 100%;
		}

		.has-body ::slotted([slot="header"]) {
			border-bottom: var(--border-width-thin) dotted
				var(--color-border-separator);
		}

		/* Footer selectors must follow forwarded slots. */
		slot[name="footer"]::slotted(*) {
			box-sizing: border-box;
			width: 100%;
			padding: var(--space-2);
			border-top: var(--border-width-thin) dotted var(--color-border-separator);
			border-radius: 0;
			background: var(--color-surface-panel);
		}
	`;

	protected override render() {
		return html`
			<div class=${this.hasBody ? "container has-body" : "container"}>
				<div class="main">
					<slot name="header"></slot>
					<div class="body"><slot></slot></div>
				</div>
				<slot name="footer"></slot>
			</div>
		`;
	}
}
