import "./Icon";
import { css } from "lit";
import { customElement } from "lit/decorators.js";
import {
	TermElement,
	type HighlightStyle,
} from "../../../shared/components/Term";
import { sliderTerm } from "../../../shared/components/SliderTerm";

const WORDS = {
	"load balancer": {
		color: "var(--load-balancer-color)",
		icon: "load balancer",
	},
	"load balancers": {
		color: "var(--load-balancer-color)",
		icon: "load balancer",
	},
	request: { color: "var(--color-text-data-green)", icon: "request" },
	requests: { color: "var(--color-text-data-green)", icon: "request" },
	server: { color: "var(--server-color)", icon: "server" },
	servers: { color: "var(--server-color)", icon: "server" },
	"server's": { color: "var(--server-color)", icon: "server" },
	drop: { color: "var(--color-text-data-red)", icon: "request" },
	dropped: { color: "var(--color-text-data-red)", icon: "request" },
	dropping: { color: "var(--color-text-data-red)", icon: "request" },
	drops: { color: "var(--color-text-data-red)", icon: "request" },
	play: { icon: "play_fill" },
	pause: { icon: "pause_fill" },
	faster: { icon: "hare" },
	slower: { icon: "tortoise" },
	reset: { icon: "arrow_clockwise" },
	shuffle: { icon: "shuffle" },
	slider: sliderTerm,
	"blue line": {
		color: "var(--color-text-data-blue)",
		icon: "line",
		css: css`
			s-icon {
				color: var(--color-palette-blue-line);
			}
		`,
	},
} satisfies Record<string, HighlightStyle>;

@customElement("t-")
export class Term extends TermElement {
	static override words = WORDS;
}
