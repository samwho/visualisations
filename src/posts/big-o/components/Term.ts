import { customElement } from "lit/decorators.js";
import { TermElement } from "../../../shared/components/Term";
import { sliderTerm } from "../../../shared/components/SliderTerm";
import "./Icon";

@customElement("t-")
export class Term extends TermElement {
	static override words = {
		run: { icon: "play", label: "Run" },
		play: { icon: "play", label: "Play" },
		step: { icon: "forward", label: "Step" },
		stepback: { icon: "back", label: "Step back" },
		restart: { icon: "restart", label: "Restart" },
		best: { icon: "star" },
		worst: { icon: "thumbs-down" },
		rand: { icon: "shuffle" },
		slider: sliderTerm,
	};
}
