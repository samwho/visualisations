import { css, html, LitElement } from "lit";
import { ThemeController } from "../core/controllers/ThemeController";
import { customElement, property } from "lit/decorators.js";
import { badgeColours, type BadgeVariant } from "./Badge";

@customElement("s-badged-value")
export class BadgedValue extends LitElement {
	@property({ reflect: true }) variant: BadgeVariant = "neutral";

	@property({ type: Boolean, reflect: true }) danger = false;

	@property({ type: Boolean, reflect: true }) warn = false;

	@property({ type: Boolean, reflect: true }) info = false;

	@property({ type: Boolean, reflect: true }) success = false;

	constructor() {
		super();
		new ThemeController(this);
	}

	static override styles = [
		badgeColours,
		css`
			:host {
				display: inline-flex;
				font-size: var(--badge-font-size, var(--type-ui-size));
				vertical-align: middle;
			}
			s-badge {
				--badge-padding-block: var(--space-1);
				--badge-padding-inline: var(--space-1);
				gap: var(--space-1);
			}
			.label {
				padding-inline: var(--space-1);
			}
			.value {
				display: inline-flex;
				align-items: center;
				justify-content: center;
				box-sizing: border-box;
				min-width: 1.5em;
				min-height: 1.5em;
				padding-inline: var(--space-1);
				border-radius: max(
					0px,
					calc(
						var(--badge-radius, var(--radius-control)) -
							var(--border-width-thin) - var(--space-1)
					)
				);
				background: var(--_badge-value-background);
				color: var(--_badge-color);
				font-variant-numeric: tabular-nums;
			}
		`,
	];

	protected override render() {
		return html`
			<s-badge
				.variant=${this.variant}
				.danger=${this.danger}
				.warn=${this.warn}
				.info=${this.info}
				.success=${this.success}
			>
				<span class="label"><slot name="label"></slot></span>
				<span class="value"><slot name="value"></slot></span>
			</s-badge>
		`;
	}
}
