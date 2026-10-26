import "./Icon";
import { css } from "lit";
import { customElement } from "lit/decorators.js";
import {
	TermElement,
	type HighlightStyle,
} from "../../../shared/components/Term";

const words: Record<string, HighlightStyle> = {};
const groups: [string[], HighlightStyle][] = [
	[
		["state", "states", "m-configuration", "estado"],
		{ color: "var(--color-text-prose-orange)", icon: "outline" },
	],
	[
		["value", "valor"],
		{ color: "var(--color-text-data-green)", icon: "outline" },
	],
	[["instruction"], { color: "var(--color-text-data-blue)", icon: "outline" }],
	[
		["head", "cabezal", "cabeza"],
		{ color: "var(--color-text-data-red)", icon: "head" },
	],
	[["tape", "cinta"], { icon: "tape" }],
	[["program", "programa"], { icon: "program" }],
	[
		["jumps", "jump", "salta", "salto"],
		{
			icon: "jump",
			css: css`
				s-icon {
					height: auto;
					vertical-align: middle;
				}
			`,
		},
	],
	[
		["blank", "blanco"],
		{
			icon: "blank",
			css: css`
				s-icon {
					/* Lift the blank glyph so it does not look like an underline. */
					height: auto;
					vertical-align: 0.12em;
				}
			`,
		},
	],
	[["play"], { icon: "play" }],
	[["pause", "pausar", "pausa"], { icon: "pause" }],
	[["restart", "reiniciar"], { icon: "restart" }],
	[["forwards", "forward", "adelante"], { icon: "forward" }],
	[["backwards", "backward", "atrás"], { icon: "back" }],
];
for (const [aliases, style] of groups) {
	for (const word of aliases) {
		words[word] = style;
	}
}

@customElement("t-")
export class Term extends TermElement {
	static override words = words;
}
