import { css, html, type TemplateResult } from "lit";
import "./Icon";
import { customElement } from "lit/decorators.js";
import {
	TermElement,
	type HighlightStyle,
} from "../../../shared/components/Term";
import { sliderTerm } from "../../../shared/components/SliderTerm";

const functionName = {
	css: css`
		code {
			font-family: var(--font-family-code);
			font-size: 0.9em;
			padding: 0.1em 0.3em;
			border: var(--border-width-thin) solid var(--color-border-subtle);
			border-radius: var(--radius-small);
			background-color: var(
				--inline-code-background,
				var(--color-surface-code)
			);
		}

		code .highlight {
			font-weight: var(--font-weight-regular);
		}

		@supports (font-size-adjust: from-font) {
			.function-name {
				font-size-adjust: from-font;
			}

			code {
				font-size: 1em;
			}
		}
	`,
	render: (highlight: TemplateResult) =>
		html`<span class="function-name"><code>${highlight}</code></span>`,
};

@customElement("t-")
export class Term extends TermElement {
	static override words = {
		changed: { color: "var(--color-text-primary)", icon: "" },
		unchanged: { color: "var(--hashing-muted-color)", icon: "" },
		randomise: { color: "var(--color-text-primary)", icon: "shuffle" },
		slider: sliderTerm,
		key: { color: "var(--hashing-key-color)", icon: "" },
		hash: { color: "var(--hashing-hash-color)", icon: "" },
		bucket: { color: "var(--hashing-bucket-color)", icon: "" },
		murmur3: {
			...functionName,
			color: "var(--color-text-data-green)",
			icon: "",
		},
		xxhash32: {
			...functionName,
			color: "var(--color-text-data-orange)",
			icon: "",
		},
		wyhash32: {
			...functionName,
			color: "var(--color-text-data-pink)",
			icon: "",
		},
		fasthash32: {
			...functionName,
			color: "var(--color-text-data-dark-blue)",
			icon: "",
		},
		stringsum: {
			...functionName,
			color: "var(--color-text-data-red)",
			icon: "",
		},
	} satisfies Record<string, HighlightStyle>;
}
