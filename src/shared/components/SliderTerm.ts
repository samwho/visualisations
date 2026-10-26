import { css } from "lit";
import type { HighlightStyle } from "./Term";

export const sliderTerm = {
	color: "var(--color-text-prose-orange)",
	icon: "slider",
	css: css`
		:host {
			--inline-icon-height: 0.8em;
			--inline-icon-align: middle;
		}
	`,
} satisfies HighlightStyle;
