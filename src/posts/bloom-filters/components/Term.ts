import { css } from "lit";
import { customElement } from "lit/decorators.js";
import { TermElement } from "../../../shared/components/Term";
import { sliderTerm } from "../../../shared/components/SliderTerm";
import "./Icon";

const bit = {
	color: "var(--color-text-prose-orange)",
	icon: "bit",
	css: css`
		s-icon {
			color: var(--color-data-fill-orange);
		}
	`,
};

@customElement("t-")
export class Term extends TermElement {
	static override words = {
		bit,
		bits: bit,
		sha1: { color: "var(--bloom-sha1-text)", icon: "" },
		sha256: { color: "var(--bloom-sha256-text)", icon: "" },
		sha512: { color: "var(--bloom-sha512-text)", icon: "" },
		rings: { icon: "coloured-rings" },
		add: { color: "var(--color-status-success-foreground)", icon: "add" },
		reset: { icon: "restart" },
		slider: sliderTerm,
		remove: {
			color: "var(--color-status-danger-foreground)",
			icon: "remove",
			css: css`
				:host {
					--inline-icon-align: middle;
				}
			`,
		},
		check: { color: "var(--color-status-info-foreground)", icon: "check" },
		clear: { color: "var(--color-status-danger-foreground)", icon: "clear" },
	};
}
