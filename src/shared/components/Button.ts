import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { PointerPress } from "../core/PointerPress";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import spinner from "../../../static/images/icons/framework7/cropped/arrow_2_circlepath.svg";

/** Optional `icon` slot precedes the default label; icon-only buttons require `label`. */
@customElement("s-button")
export class Button extends LitElement {
	static override shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	private readonly pointerPress = new PointerPress(this);

	@state() private hasIcon = false;

	@state() private hasText = false;

	// slotchange doesn't fire when an existing label's text node changes.
	private readonly contentObserver = new MutationObserver(() =>
		this.syncSlots(),
	);

	override connectedCallback(): void {
		super.connectedCallback();
		this.contentObserver.observe(this, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
			attributeFilter: ["slot"],
		});
		this.syncSlots();
	}

	override disconnectedCallback(): void {
		this.contentObserver.disconnect();
		super.disconnectedCallback();
	}

	private readonly syncSlots = (): void => {
		const icon =
			this.renderRoot.querySelector<HTMLSlotElement>('slot[name="icon"]');
		const text =
			this.renderRoot.querySelector<HTMLSlotElement>("slot:not([name])");
		if (!icon || !text) {
			return;
		}
		this.hasIcon = icon.assignedElements({ flatten: true }).length > 0;
		this.hasText = text
			.assignedNodes({ flatten: true })
			.some(
				(node) =>
					node.nodeType === Node.ELEMENT_NODE ||
					(node.nodeType === Node.TEXT_NODE &&
						(node.textContent ?? "").trim() !== ""),
			);
	};

	protected override updated(): void {
		const iconOnly = this.hasIcon && !this.hasText;
		this.toggleAttribute("data-icon-only", iconOnly);
		if (iconOnly && !this.label.trim()) {
			throw new Error("Icon-only s-button requires a label naming its action");
		}
	}

	@property({ type: Boolean })
	disabled = false;

	/** Busy buttons keep their label and size, but prevent another activation. */
	@property({ type: Boolean, reflect: true })
	loading = false;

	/** Semantic colour variants, owned by the shared control and site theme. */
	@property({ type: String, reflect: true })
	variant:
		| "neutral"
		| "success"
		| "warning"
		| "info"
		| "danger"
		| "accent"
		| "workspace" = "neutral";

	/** `filled` aliases `solid`; outlined and ghost controls use the surface beneath them. */
	@property({ type: String, reflect: true })
	appearance: "solid" | "filled" | "ghost" | "outlined" | undefined = "solid";

	/** Accessible name forwarded to the focusable native button. */
	@property({ type: String })
	label = "";

	/** Optional toggle state forwarded to the focusable native button. */
	@property({ type: Boolean, reflect: true })
	pressed?: boolean;

	/** Optional disclosure state forwarded to the focusable native button. */
	@property({ type: Boolean })
	expanded?: boolean;

	@property({ type: String })
	type = "button";

	@property({ type: String, reflect: true })
	size: "xs" | "sm" | "md" | "lg" | "xl" = "md";

	static override styles = css`
		:host {
			--color-action-workspace-background: var(--stone-700);
			--color-action-workspace-background-hover: var(--stone-600);
			--color-action-workspace-foreground: var(--white);
			--color-action-workspace-background-disabled: var(--stone-800);
			--color-action-workspace-foreground-disabled: var(--stone-400);
			--button-min-width: var(--control-min-width);
			--button-height: var(--control-min-height);
			--_button-background: var(--color-action-neutral-background);
			--_button-background-hover: var(--color-action-neutral-background-hover);
			--_button-foreground: var(--color-action-neutral-foreground);
			min-height: var(--button-height);
			min-width: var(--button-min-width);
		}

		:host([size="xs"]) {
			--button-height: var(--control-target-min-size);
		}
		:host([size="sm"]) {
			--button-height: var(--control-min-height-small);
		}
		:host([size="lg"]) {
			--button-height: var(--control-min-height-large);
		}
		:host([size="xl"]) {
			--button-height: var(--control-min-height-xlarge);
		}
		:host([data-icon-only]) {
			--button-min-width: calc(var(--button-height) + var(--space-2));
			display: inline-flex;
			flex: none;
			width: var(--button-min-width);
			height: var(--button-height);
		}
		:host([data-icon-only]) button {
			padding: 0;
			border: var(--border-width-thin) solid transparent;
			border-radius: var(--button-border-radius, var(--radius-control));
		}

		:host([variant="success"]) {
			--_button-foreground: var(--color-status-success-on-solid);
			--_button-background: var(--color-status-success-background-solid);
			--_button-background-hover: var(
				--color-status-success-background-solid-hover
			);
		}
		:host([variant="warning"]) {
			--_button-foreground: var(--color-status-warning-on-solid);
			--_button-background: var(--color-status-warning-background-solid);
			--_button-background-hover: var(
				--color-status-warning-background-solid-hover
			);
		}
		:host([variant="info"]) {
			--_button-foreground: var(--color-status-info-on-solid);
			--_button-background: var(--color-status-info-background-solid);
			--_button-background-hover: var(
				--color-status-info-background-solid-hover
			);
		}
		:host([variant="danger"]) {
			--_button-foreground: var(--color-status-danger-on-solid);
			--_button-background: var(--color-status-danger-background-solid);
			--_button-background-hover: var(
				--color-status-danger-background-solid-hover
			);
		}

		:host([variant="accent"]) {
			--_button-foreground: var(--color-action-emphasis-foreground);
			--_button-background: var(--color-action-emphasis-background);
			--_button-background-hover: var(--color-action-emphasis-background-hover);
		}
		:host([variant="workspace"]) {
			--_button-background: var(--color-action-workspace-background);
			--_button-background-hover: var(
				--color-action-workspace-background-hover
			);
		}

		button {
			position: relative;
			-webkit-tap-highlight-color: transparent;
			align-items: center;
			background-color: var(--_button-background);
			border-radius: var(--radius-control);
			border: none;
			color: var(--_button-foreground);
			cursor: pointer;
			display: inline-flex;
			gap: var(--control-gap);
			font-family: var(--font-family-body);
			font-size: var(--type-ui-size);
			justify-content: center;
			line-height: var(--type-ui-line-height);
			min-height: inherit;
			min-width: inherit;
			padding: var(--control-padding-block) var(--control-padding-inline);
			touch-action: manipulation;
			transform: scale(1);
			transition:
				background-color var(--motion-duration-state) ease,
				color var(--motion-duration-state) ease,
				transform var(--motion-duration-press) var(--motion-ease-out);
			user-select: none;
			width: 100%;
			height: 100%;
			box-sizing: border-box;
		}

		@media (hover: hover) and (pointer: fine) {
			button:hover:not(:disabled) {
				background-color: var(--_button-background-hover);
			}

			:host([appearance="ghost"]) button:hover:not(:disabled),
			:host([appearance="outlined"]) button:hover:not(:disabled) {
				background-color: var(--color-action-ghost-background-hover);
			}
		}

		:host([pressing]) button:not(:disabled) {
			transform: scale(0.96);
		}

		:host([variant="workspace"]) button {
			color: var(--color-action-workspace-foreground);
		}
		:host([variant="workspace"]) button:disabled {
			background: var(--color-action-workspace-background-disabled);
			color: var(--color-action-workspace-foreground-disabled);
		}
		.content {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: inherit;
		}
		.icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex: none;
			height: var(--control-icon-size);
		}
		.icon[hidden],
		.text[hidden] {
			display: none;
		}
		slot[name="icon"]::slotted(*) {
			display: block;
			width: auto;
			height: 100%;
			fill: currentColor;
		}
		slot[name="icon"]::slotted(span) {
			width: var(--control-icon-size);
		}
		:host([loading]) .content {
			opacity: 0;
		}
		.spinner {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			pointer-events: none;
		}
		.spinner svg {
			width: var(--control-icon-size);
			height: var(--control-icon-size);
			fill: currentColor;
			animation: spin 1s linear infinite;
		}
		@keyframes spin {
			to {
				transform: rotate(360deg);
			}
		}

		/* Native button owns activation, not the slotted label. */
		slot {
			pointer-events: none;
		}

		:host([appearance="ghost"]) button,
		:host([appearance="outlined"]) button {
			background-color: transparent;
			color: var(--color-action-ghost-foreground);
		}

		:host([appearance="outlined"]) button {
			border: var(--border-width-thin) solid var(--color-border-control);
		}

		:host([appearance="ghost"][pressed]) button {
			color: var(--color-action-neutral-foreground);
		}

		:host([data-icon-only][appearance="ghost"]) button,
		:host([data-icon-only][appearance="ghost"][loading]) button:disabled {
			background-color: transparent;
			color: var(--color-action-ghost-foreground);
		}
		:host([data-icon-only][appearance="outlined"]) button,
		:host([data-icon-only][appearance="outlined"][loading]) button:disabled {
			background-color: var(--color-surface-panel);
			color: var(--color-text-primary);
			border-color: var(--color-border-control);
		}
		:host([data-icon-only]) button:disabled {
			opacity: var(--opacity-disabled);
		}
		:host([data-icon-only][loading]) button:disabled {
			opacity: 1;
		}
		button:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: var(--focus-ring-offset);
		}

		button:disabled {
			background-color: var(--color-action-neutral-background-disabled);
			color: var(--color-text-disabled);
			cursor: not-allowed;
		}
		:host([loading]) button:disabled {
			background-color: var(--_button-background);
			color: var(--_button-foreground);
			cursor: wait;
		}

		@media (prefers-reduced-motion: reduce) {
			.spinner svg {
				animation: none;
			}
			button,
			:host([pressing]) button:not(:disabled) {
				transform: none;
				transition: none;
			}
		}
	`;

	private handlePointerDown = (event: PointerEvent): void => {
		if (!this.disabled && !this.loading) {
			this.pointerPress.start(event);
		}
	};

	override render() {
		return html`
			<button
				part="button"
				type=${this.type}
				?disabled=${this.disabled || this.loading}
				aria-busy=${ifDefined(this.loading ? "true" : undefined)}
				aria-label=${ifDefined(this.label || undefined)}
				aria-expanded=${ifDefined(
					this.expanded === undefined ? undefined : String(this.expanded),
				)}
				aria-pressed=${ifDefined(
					this.pressed === undefined ? undefined : String(this.pressed),
				)}
				@pointerdown=${this.handlePointerDown}
				@pointerup=${this.pointerPress.end}
				@pointercancel=${this.pointerPress.end}
			>
				<span class="content">
					<span
						class="icon"
						aria-hidden="true"
						?hidden=${!this.hasIcon}
					>
						<slot
							name="icon"
							@slotchange=${this.syncSlots}
						></slot>
					</span>
					<span
						class="text"
						?hidden=${!this.hasText}
					>
						<slot @slotchange=${this.syncSlots}></slot>
					</span>
				</span>
				${
					this.loading
						? html`<span
								class="spinner"
								part="spinner"
								aria-hidden="true"
								>${unsafeSVG(spinner)}</span
							>`
						: ""
				}
			</button>
		`;
	}
}
