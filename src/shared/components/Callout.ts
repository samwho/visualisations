import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./FullBleed";

export type CalloutColor =
	| "default"
	| "orange"
	| "blue"
	| "green"
	| "yellow"
	| "dark-blue"
	| "red"
	| "pink"
	| "grey";

/** A static note: arbitrary content, an optional decorative icon, and a palette accent. */
@customElement("s-callout")
export class Callout extends LitElement {
	@property({ type: String, reflect: true })
	color: CalloutColor = "default";

	@state()
	private hasIcon = false;

	static override styles = css`
		:host {
			--callout-accent: var(--color-border-decoration);
			display: block;
			container-type: inline-size;
			margin-block: var(--space-4);
		}

		:host([color="blue"]) {
			--callout-accent: var(--palette-blue);
		}
		:host([color="orange"]) {
			--callout-accent: var(--palette-orange);
		}
		:host([color="green"]) {
			--callout-accent: var(--palette-green);
		}
		:host([color="yellow"]) {
			--callout-accent: var(--palette-yellow);
		}
		:host([color="dark-blue"]) {
			--callout-accent: var(--palette-dark-blue);
		}
		:host([color="red"]) {
			--callout-accent: var(--palette-red);
		}
		:host([color="pink"]) {
			--callout-accent: var(--palette-pink);
		}
		:host([color="grey"]) {
			--callout-accent: var(--palette-grey);
		}

		s-full-bleed {
			padding-block: var(--space-7);
		}

		.note {
			position: relative;
			font-family: var(--font-family-heading);
			font-size: var(--type-callout-size);
			line-height: var(--line-height-normal);
			text-align: center;
			text-wrap: balance;
		}

		.has-icon {
			padding-inline-start: var(--space-9);
		}

		.icon {
			position: absolute;
			inset-block-start: 0;
			inset-inline-start: 0;
			width: var(--icon-size-xlarge);
			height: var(--icon-size-xlarge);
			color: var(--callout-accent);
		}

		::slotted([slot="icon"]) {
			display: block;
			width: 100%;
			height: 100%;
		}

		@container (width < 40ch) {
			s-full-bleed {
				padding-block: var(--space-5);
			}
			.has-icon {
				padding-inline-start: var(--space-7);
			}
			.icon {
				width: var(--icon-size-large);
				height: var(--icon-size-large);
			}
		}
	`;

	private readonly handleIconChange = (event: Event): void => {
		// SAFETY: this listener is attached directly to the icon slot.
		const slot = event.currentTarget as HTMLSlotElement;
		this.hasIcon = slot.assignedNodes().length > 0;
	};

	protected override render() {
		return html`
			<s-full-bleed>
				<div
					class=${this.hasIcon ? "note has-icon" : "note"}
					role="note"
				>
					<span
						class="icon"
						aria-hidden="true"
					>
						<slot
							name="icon"
							@slotchange=${this.handleIconChange}
						></slot>
					</span>
					<slot></slot>
				</div>
			</s-full-bleed>
		`;
	}
}
