import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";

@customElement("s-select")
export class Select extends LitElement {
	@property({ type: Boolean })
	disabled = false;

	@property({ type: Boolean, reflect: true })
	rounded = false;

	@property({ type: String })
	value?: string;

	/** Accessible name forwarded to the focusable native select. */
	@property({ type: String })
	label = "";

	/** Optional visible label, associated with the native control in this shadow root. */
	@property({ type: String, reflect: true, attribute: "visible-label" })
	visibleLabel = "";

	@query("select")
	private selectElement!: HTMLSelectElement;

	@query("slot")
	private slotElement!: HTMLSlotElement;

	static override styles = css`
		:host {
			--color-action-neutral-chevron: color-mix(
				in srgb,
				var(--color-action-neutral-foreground) 85%,
				var(--color-action-neutral-background)
			);
			--_select-radius: var(--radius-control);
			display: inline-block;
			min-width: calc(2 * var(--control-min-width));
		}

		.control-label {
			display: block;
			margin-bottom: var(--control-label-gap, var(--space-2));
		}

		:host([visible-label]:not([visible-label=""])) .select-wrapper {
			height: auto;
			min-height: inherit;
		}

		.select-wrapper {
			position: relative;
			width: 100%;
			height: 100%;
		}

		slot {
			display: none;
		}

		select {
			-webkit-tap-highlight-color: transparent;
			align-items: center;
			appearance: none;
			background-color: var(--color-action-neutral-background);
			border: none;
			border-radius: var(--_select-radius);
			box-sizing: border-box;
			color: var(--color-action-neutral-foreground);
			cursor: pointer;
			display: inline-flex;
			font-family: var(--font-family-body);
			font-size: var(--type-ui-size);
			height: 100%;
			justify-content: space-between;
			line-height: var(--type-ui-line-height);
			min-height: inherit;
			padding: var(--space-2) var(--space-7) var(--space-2) var(--space-3);
			text-align: center;
			touch-action: manipulation;
			transition:
				background-color var(--motion-duration-state) ease,
				box-shadow var(--motion-duration-state) ease;
			user-select: none;
			width: 100%;
		}

		:host([rounded]) {
			--_select-radius: var(--radius-pill);
		}

		@media (hover: hover) and (pointer: fine) {
			select:hover:not(:disabled) {
				background-color: var(--color-action-neutral-background-hover);
			}
		}

		select:disabled {
			background-color: var(--color-action-neutral-background-disabled);
			cursor: not-allowed;
		}

		select::-ms-expand {
			display: none;
		}

		.chevron {
			position: absolute;
			top: 50%;
			right: var(--space-4);
			width: 0;
			height: 0;
			border-top: 0.45rem solid var(--color-action-neutral-chevron);
			border-right: 0.35rem solid transparent;
			border-left: 0.35rem solid transparent;
			opacity: 0.9;
			pointer-events: none;
			transform: translateY(-20%);
		}
	`;

	override firstUpdated(): void {
		this.syncOptions();
		if (this.value === undefined || this.value === "") {
			this.value = this.selectElement.value;
		}
	}

	override updated(changed: Map<string, unknown>): void {
		if (
			changed.has("value") &&
			this.value !== undefined &&
			this.selectElement.value !== this.value
		) {
			this.selectElement.value = this.value;
		}
	}

	private syncOptions(): void {
		const assigned = this.slotElement
			.assignedNodes({ flatten: true })
			.filter(
				(node): node is HTMLOptionElement | HTMLOptGroupElement =>
					node instanceof HTMLOptionElement ||
					node instanceof HTMLOptGroupElement,
			);

		const clones = assigned.map((node) => node.cloneNode(true));
		this.selectElement.replaceChildren(...clones);

		if (this.value !== undefined) {
			this.selectElement.value = this.value;
		} else if (this.selectElement.options.length > 0) {
			this.value = this.selectElement.value;
		}
	}

	private handleChange(): void {
		this.value = this.selectElement.value;
		this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	}

	override render() {
		return html`
			${
				this.visibleLabel
					? html`<label
							class="control-label"
							part="label"
							for="control"
							>${this.visibleLabel}</label
						>`
					: null
			}
			<div class="select-wrapper">
				<slot @slotchange=${this.syncOptions}></slot>
				<select
					id="control"
					part="select"
					?disabled=${this.disabled}
					aria-label=${ifDefined(this.label && this.label !== this.visibleLabel ? this.label : undefined)}
					@change=${this.handleChange}
				></select>
				<span
					class="chevron"
					aria-hidden="true"
				></span>
			</div>
		`;
	}
}
