import "./Icon";
import { customElement } from "lit/decorators.js";
import { TermElement } from "../../../shared/components/Term";
import { sliderTerm } from "../../../shared/components/SliderTerm";

@customElement("t-")
export class Term extends TermElement {
	static override words = {
		threshold: { color: "var(--color-text-data-orange)", icon: "" },
		"sent logs": { color: "var(--color-text-primary)", icon: "" },
		"total logs": { color: "var(--color-text-secondary)", icon: "" },
		"held card": { color: "var(--color-text-data-dark-blue)", icon: "" },
		hold: { color: "var(--color-text-data-dark-blue)", icon: "" },
		"discard pile": { color: "var(--color-text-data-red)", icon: "" },
		discard: { color: "var(--color-text-data-red)", icon: "" },
		replace: { color: "var(--color-text-data-red)", icon: "" },
		reset: { icon: "restart" },
		play: { icon: "play" },
		"speed up": { icon: "hare" },
		"slow down": { icon: "tortoise" },
		slider: sliderTerm,
	};
}
