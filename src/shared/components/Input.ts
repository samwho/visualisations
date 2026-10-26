import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { live } from "lit/directives/live.js";
import { ifDefined } from "lit/directives/if-defined.js";

/** A labelled, themed text input. Native input/keydown events cross its shadow root. */
@customElement("s-input")
export class Input extends LitElement {
	@property() value = "";

	@property() label = "Value";

	@property() placeholder = "";

	@property({ type: Number }) maxlength?: number;

	@property({ type: Boolean }) disabled = false;

	@property({ type: Boolean, reflect: true }) success = false;

	static override styles = css`
		:host {
			display: block;
			min-width: 0;
		}
		input {
			box-sizing: border-box;
			width: 100%;
			min-width: 0;
			min-height: var(--control-min-height);
			border: var(--border-width-thin) solid var(--color-border-control);
			border-radius: var(--radius-control);
			padding: var(--control-padding-block) var(--control-padding-inline);
			padding-inline-end: var(
				--input-padding-inline-end,
				var(--control-padding-inline)
			);
			font: var(--type-ui-size)/var(--type-ui-line-height)
				var(--font-family-body);
			background: var(--color-surface-input);
			color: var(--color-text-input);
		}
		input::placeholder {
			color: var(--color-text-placeholder);
			opacity: 1;
		}
		:host([success]) input {
			border-color: var(--color-palette-green-border);
			background: var(--color-palette-green-surface);
			color: var(--color-palette-green-foreground);
		}
		input:focus-visible {
			outline: var(--focus-ring-width) solid var(--focus-ring-color);
			outline-offset: var(--focus-ring-offset);
		}
	`;

	protected override render() {
		return html`<input
			type="text"
			aria-label=${this.label}
			placeholder=${this.placeholder}
			maxlength=${ifDefined(this.maxlength)}
			?disabled=${this.disabled}
			.value=${live(this.value)}
			@input=${(event: Event) => {
				// SAFETY: this listener is attached directly to the native input below our shadow boundary.
				this.value = (event.target as HTMLInputElement).value;
			}}
		/>`;
	}
}
