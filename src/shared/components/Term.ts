import {
	adoptStyles,
	css,
	html,
	LitElement,
	nothing,
	type CSSResult,
	type CSSResultGroup,
	type TemplateResult,
} from "lit";

export interface HighlightStyle {
	color?: string;
	icon: string;
	label?: string;
	css?: CSSResult;
	/** Receives the default highlight, including its icon and accessible label. */
	render?: (highlight: TemplateResult) => TemplateResult;
}

function normalize(value: string): string {
	return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

/**
 * Renders highlighted prose from a declarative word registry. Register a
 * subclass as t- and declare its static words map using lowercase keys with
 * single spaces. <t->play</t-> looks up its text; <t- key="play">start</t->
 * selects the same definition while keeping "start" as the displayed text.
 *
 * Definitions specify colour, an icon name (or "" for none), and optionally
 * a label for an icon-only use. Custom treatment belongs in the definition:
 * css is a Lit css template scoped to this instance, after the base styles;
 * render(highlight) receives the default template, including its icon and
 * accessible label, and returns the custom template.
 *
 * Keep subclasses to definitions, aliases and registration. Don't add styling
 * or render overrides, or teach this base about particular words. Consult Sam
 * before adding exceptions or expanding its purpose beyond highlighted prose.
 */
export class TermElement extends LitElement {
	static words: Readonly<Record<string, HighlightStyle>> = {};

	private appliedCSS?: CSSResult;

	static override styles: CSSResultGroup = css`
		:host,
		.highlight {
			white-space: nowrap;
		}

		.highlight {
			font-weight: var(--font-weight-bold);
		}

		s-icon {
			height: var(--inline-icon-height, 1ex);
			margin-inline-end: var(--inline-icon-gap, 0.1em);
			margin-inline-start: 0.05em;
			vertical-align: var(--inline-icon-align, baseline);
		}
	`;

	protected override render() {
		const text = this.textContent?.trim() ?? "";
		const key = normalize(this.getAttribute("key") ?? text);
		// SAFETY: every subclass inherits the static words contract from TermElement.
		const elementClass = this.constructor as typeof TermElement;
		const style = elementClass.words[key];
		if (this.shadowRoot !== null && style?.css !== this.appliedCSS) {
			// Append the selected stylesheet after the base; never mutate shared sheets.
			adoptStyles(
				this.shadowRoot,
				style?.css === undefined
					? elementClass.elementStyles
					: [...elementClass.elementStyles, style.css],
			);
			this.appliedCSS = style?.css;
		}
		const label = text === "" ? style?.label : undefined;
		const hasLabel = label !== undefined && label !== "";
		const highlight = html`<span
			class="highlight"
			style=${style?.color !== undefined && style.color !== "" ? `color: ${style.color}` : nothing}
			>${
				style !== undefined && style.icon !== ""
					? html`<s-icon
							name=${style.icon}
							role=${hasLabel ? "img" : nothing}
							aria-label=${label ?? nothing}
							aria-hidden=${hasLabel ? nothing : "true"}
						></s-icon>`
					: nothing
			}${text}</span
		>`;
		return style?.render ? style.render(highlight) : highlight;
	}
}
