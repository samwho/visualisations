import { css, html, LitElement } from "lit";
import { ThemeController } from "../core/controllers/ThemeController";
import { customElement, property } from "lit/decorators.js";

export type BadgeVariant =
	| "neutral"
	| "orange"
	| "blue"
	| "green"
	| "yellow"
	| "dark-blue"
	| "red"
	| "pink"
	| "grey";

export const badgeColours = css`
	:host {
		--color-badge-background: color-mix(
			in srgb,
			var(--color-surface-default) 50%,
			var(--color-surface-panel)
		);
		--color-badge-border: color-mix(
			in srgb,
			var(--color-text-primary) 10%,
			transparent
		);
		--color-badge-value-background: color-mix(
			in srgb,
			var(--color-text-primary) 10%,
			var(--color-badge-background)
		);
		--_badge-background: var(--color-badge-background);
		--_badge-border: var(--color-badge-border);
		--_badge-color: var(--color-text-primary);
		--_badge-value-background: var(--color-badge-value-background);
	}
	:host([data-theme="dark"]) {
		--color-badge-border: var(--color-border-subtle);
	}
	:host([variant="orange"]) {
		--_badge-background: var(--color-palette-orange-surface);
		--_badge-value-background: var(--color-palette-orange-surface-strong);
		--_badge-border: var(--color-palette-orange-border);
		--_badge-color: var(--color-palette-orange-foreground);
	}
	:host([variant="blue"]) {
		--_badge-background: var(--color-palette-blue-surface);
		--_badge-value-background: var(--color-palette-blue-surface-strong);
		--_badge-border: var(--color-palette-blue-border);
		--_badge-color: var(--color-palette-blue-foreground);
	}
	:host([variant="green"]) {
		--_badge-background: var(--color-palette-green-surface);
		--_badge-value-background: var(--color-palette-green-surface-strong);
		--_badge-border: var(--color-palette-green-border);
		--_badge-color: var(--color-palette-green-foreground);
	}
	:host([variant="yellow"]) {
		--_badge-background: var(--color-palette-yellow-surface);
		--_badge-value-background: var(--color-palette-yellow-surface-strong);
		--_badge-border: var(--color-palette-yellow-border);
		--_badge-color: var(--color-palette-yellow-foreground);
	}
	:host([variant="dark-blue"]) {
		--_badge-background: var(--color-palette-dark-blue-surface);
		--_badge-value-background: var(--color-palette-dark-blue-surface-strong);
		--_badge-border: var(--color-palette-dark-blue-border);
		--_badge-color: var(--color-palette-dark-blue-foreground);
	}
	:host([variant="red"]) {
		--_badge-background: var(--color-palette-red-surface);
		--_badge-value-background: var(--color-palette-red-surface-strong);
		--_badge-border: var(--color-palette-red-border);
		--_badge-color: var(--color-palette-red-foreground);
	}
	:host([variant="pink"]) {
		--_badge-background: var(--color-palette-pink-surface);
		--_badge-value-background: var(--color-palette-pink-surface-strong);
		--_badge-border: var(--color-palette-pink-border);
		--_badge-color: var(--color-palette-pink-foreground);
	}
	:host([variant="grey"]) {
		--_badge-background: var(--color-palette-grey-surface);
		--_badge-value-background: var(--color-palette-grey-surface-strong);
		--_badge-border: var(--color-palette-grey-border);
		--_badge-color: var(--color-palette-grey-foreground);
	}
	/* Severity overrides palette; danger wins. */
	:host([success]) {
		--_badge-background: var(--color-palette-green-surface);
		--_badge-value-background: var(--color-palette-green-surface-strong);
		--_badge-border: var(--color-palette-green-border);
		--_badge-color: var(--color-palette-green-foreground);
	}
	:host([info]) {
		--_badge-background: var(--color-palette-blue-surface);
		--_badge-value-background: var(--color-palette-blue-surface-strong);
		--_badge-border: var(--color-palette-blue-border);
		--_badge-color: var(--color-palette-blue-foreground);
	}
	:host([warn]) {
		--_badge-background: var(--color-palette-orange-surface);
		--_badge-value-background: var(--color-palette-orange-surface-strong);
		--_badge-border: var(--color-palette-orange-border);
		--_badge-color: var(--color-palette-orange-foreground);
	}
	:host([danger]) {
		--_badge-background: var(--color-palette-red-surface);
		--_badge-value-background: var(--color-palette-red-surface-strong);
		--_badge-border: var(--color-palette-red-border);
		--_badge-color: var(--color-palette-red-foreground);
	}
`;

@customElement("s-badge")
export class Badge extends LitElement {
	@property({ reflect: true }) variant: BadgeVariant = "neutral";

	@property({ reflect: true }) size: "normal" | "large" = "normal";

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
				align-items: center;
				box-sizing: border-box;
				padding: var(--badge-padding-block, var(--space-1))
					var(--badge-padding-inline, var(--space-2));
				border: var(--border-width-thin) solid var(--_badge-border);
				border-radius: var(--badge-radius, var(--radius-control));
				background: var(--_badge-background);
				color: var(--_badge-color);
				font-size: var(--badge-font-size, var(--type-ui-size));
				line-height: var(--line-height-normal);
				vertical-align: middle;
				white-space: nowrap;
			}
			:host([size="large"]) {
				min-height: var(--control-min-height);
				padding: calc(var(--control-padding-block) - var(--border-width-thin))
					var(--control-padding-inline);
				line-height: var(--type-ui-line-height);
			}
		`,
	];

	protected override render() {
		return html`<slot></slot>`;
	}
}
