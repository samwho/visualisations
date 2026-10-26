import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { live } from "lit/directives/live.js";
import { repeat } from "lit/directives/repeat.js";

export interface RadioOption {
	value: string;
	label: string;
	disabled?: boolean;
}

@customElement("s-radio-group")
export class RadioGroup extends LitElement {
	static override shadowRootOptions = {
		...LitElement.shadowRootOptions,
		delegatesFocus: true,
	};

	/** Slots named after values can replace option text; labels still name the radios. */
	@property({ attribute: false })
	options: readonly RadioOption[] = [];

	@property({ type: String })
	value = "";

	/** Accessible name for the native group. */
	@property({ type: String })
	label = "";

	@property({ type: String, attribute: "visible-label" })
	visibleLabel = "";

	@property({ type: Boolean })
	disabled = false;

	/** Joined buttons retain the same native radio semantics and keyboard input. */
	@property({ type: String, reflect: true })
	appearance: "radio" | "button" = "radio";

	static override styles = css`
		:host {
			display: inline-block;
			min-width: 0;
		}
		fieldset {
			border: 0;
			padding: 0;
			margin: 0;
			min-width: 0;
			font-family: var(--font-family-body);
			font-size: var(--type-ui-size);
			line-height: var(--type-ui-line-height);
			color: var(--color-text-primary);
		}
		legend {
			padding: 0;
			margin-bottom: var(--space-2);
		}
		.options {
			display: flex;
			flex-wrap: wrap;
			gap: var(--space-1) var(--space-3);
		}
		label {
			display: inline-flex;
			align-items: center;
			gap: var(--space-2);
			min-height: var(--control-min-height);
			cursor: pointer;
			touch-action: manipulation;
		}
		slot {
			display: inline-flex;
			align-items: center;
		}
		input {
			margin: 0;
			width: 1em;
			height: 1em;
			appearance: none;
			box-sizing: border-box;
			border: var(--border-width-thick) solid var(--color-border-control);
			border-radius: var(--radius-circle);
			background: var(--color-surface-input);
			cursor: inherit;
		}
		input:checked {
			border-color: var(--color-action-primary-background);
			background: var(--color-action-primary-background);
			box-shadow: inset 0 0 0 var(--border-width-thick)
				var(--color-surface-input);
		}
		input:disabled {
			border-color: var(--color-control-disabled-indicator);
		}
		input:checked:disabled {
			background: var(--color-control-disabled-indicator);
		}
		@media (forced-colors: active) {
			input,
			input:checked {
				appearance: auto;
				box-shadow: none;
			}
		}
		input:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: var(--focus-ring-offset);
		}
		label:has(input:disabled) {
			color: var(--color-control-disabled-indicator);
			cursor: not-allowed;
		}
		:host([appearance="button"]) .options {
			flex-wrap: nowrap;
			gap: 0;
		}
		:host([appearance="button"]) label {
			position: relative;
			flex: 1 0 auto;
			white-space: nowrap;
			justify-content: center;
			box-sizing: border-box;
			min-width: var(--control-min-width);
			padding: var(--control-padding-block) var(--control-padding-inline);
			border: var(--border-width-thin) solid var(--color-border-control);
			background: var(--color-surface-panel);
			color: var(--color-text-input);
		}
		:host([appearance="button"]) label + label {
			margin-inline-start: calc(-1 * var(--border-width-thin));
		}
		:host([appearance="button"]) label:first-child {
			border-start-start-radius: var(--radius-control);
			border-end-start-radius: var(--radius-control);
		}
		:host([appearance="button"]) label:last-child {
			border-start-end-radius: var(--radius-control);
			border-end-end-radius: var(--radius-control);
		}
		:host([appearance="button"]) input {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			opacity: 0;
		}
		:host([appearance="button"]) label:has(input:checked) {
			z-index: 1;
			background: var(--color-surface-selected);
			color: var(--color-text-selected);
		}
		@media (hover: hover) and (pointer: fine) {
			:host([appearance="button"])
				label:hover:not(:has(input:disabled, input:checked)) {
				background: var(--color-action-ghost-background-hover);
			}
		}
		:host([appearance="button"]) label:has(input:disabled) {
			background: var(--color-action-neutral-background-disabled);
			color: var(--color-control-disabled-indicator);
		}
		:host([appearance="button"]) label:has(input:focus-visible) {
			z-index: 2;
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: var(--focus-ring-offset);
		}
		@media (forced-colors: active) {
			:host([appearance="button"]) input {
				position: static;
				width: 1em;
				height: 1em;
				opacity: 1;
			}
		}
	`;

	private readonly reselect = (event: MouseEvent): void => {
		// SAFETY: this listener belongs to a native option; click precedes change.
		const input = event.currentTarget as HTMLInputElement;
		if (
			this.appearance === "button" &&
			!this.disabled &&
			!input.disabled &&
			input.value === this.value
		) {
			this.dispatchEvent(
				new Event("reselect", { bubbles: true, composed: true }),
			);
		}
	};

	private readonly change = (event: Event): void => {
		// SAFETY: only native radios inside this fieldset emit change.
		this.value = (event.target as HTMLInputElement).value;
		this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
	};

	protected override render() {
		return html`
			<fieldset
				?disabled=${this.disabled}
				aria-label=${ifDefined(this.label && this.label !== this.visibleLabel ? this.label : undefined)}
				@change=${this.change}
			>
				${this.visibleLabel ? html`<legend part="label">${this.visibleLabel}</legend>` : null}
				<div
					class="options"
					part="options"
				>
					${repeat(
						this.options,
						(option) => option.value,
						(option) => html`
							<label
								part="option"
								title=${option.label}
							>
								<input
									type="radio"
									aria-label=${option.label}
									name="choice"
									.value=${option.value}
									.checked=${live(this.value === option.value)}
									?disabled=${option.disabled}
									@click=${this.reselect}
								/>
								<slot
									name=${option.value}
									aria-hidden="true"
									>${option.label}</slot
								>
							</label>
						`,
					)}
				</div>
			</fieldset>
		`;
	}
}
