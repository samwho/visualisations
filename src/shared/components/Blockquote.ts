import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./FullBleed";

/**
 * Native quotation semantics with arbitrary flow content in the default slot.
 * Put author/source details in slot="attribution", outside the quoted text.
 */
@customElement("s-blockquote")
export class Blockquote extends LitElement {
	@property({ type: String })
	cite = "";

	@state()
	private hasAttribution = false;

	static override styles = css`
		:host {
			display: block;
			container-type: inline-size;
			margin-block: var(--space-6);
		}

		s-full-bleed {
			padding-block: var(--space-7);
		}

		figure {
			margin: 0;
		}

		figcaption {
			margin-block-start: var(--space-4);
			margin-inline-start: var(--space-9);
			font-family: var(--font-family-body);
			font-size: var(--type-ui-size);
			font-style: normal;
		}

		blockquote {
			position: relative;
			display: grid;
			grid-template-columns: var(--icon-size-xlarge) minmax(0, 1fr);
			align-items: start;
			gap: var(--space-4);
			margin: 0;
			font-family: var(--font-family-heading);
			font-size: var(--type-callout-size);
			font-style: italic;
			line-height: var(--line-height-normal);
			text-align: left;
			text-wrap: wrap;
		}

		.mark {
			position: absolute;
			inset-block-start: 0;
			inset-inline-start: 0;
			color: var(--palette-red);
			font-size: var(--font-size-display-xlarge);
			font-style: normal;
			line-height: var(--line-height-solid);
			user-select: none;
		}

		.body {
			grid-column: 2;
			min-width: 0;
		}

		@container (width < 40ch) {
			s-full-bleed {
				padding-block: var(--space-5);
			}

			blockquote {
				grid-template-columns: var(--icon-size-large) minmax(0, 1fr);
				gap: var(--space-2);
			}

			figcaption {
				margin-inline-start: var(--space-7);
			}

			.mark {
				font-size: var(--font-size-display-large);
			}
		}
	`;

	private readonly handleAttributionChange = (event: Event): void => {
		// SAFETY: this listener is attached to the attribution slot.
		const slot = event.currentTarget as HTMLSlotElement;
		this.hasAttribution = slot.assignedNodes().length > 0;
	};

	protected override render() {
		return html`
			<s-full-bleed>
				<figure>
					<blockquote cite=${this.cite || nothing}>
						<span
							class="mark"
							aria-hidden="true"
							>“</span
						>
						<div class="body"><slot></slot></div>
					</blockquote>
					<figcaption ?hidden=${!this.hasAttribution}>
						<slot
							name="attribution"
							@slotchange=${this.handleAttributionChange}
						></slot>
					</figcaption>
				</figure>
			</s-full-bleed>
		`;
	}
}
