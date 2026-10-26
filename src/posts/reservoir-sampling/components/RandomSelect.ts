import { css } from "lit";
import { customElement } from "lit/decorators.js";
import { CardPicker } from "./CardPicker";
import { shuffled } from "../core/Cards";

@customElement("s-random-select")
export class RandomSelect extends CardPicker {
	static override styles = [
		CardPicker.styles,
		css`
			s-playing-card {
				transition:
					filter var(--motion-duration-state),
					opacity var(--motion-duration-state);
			}
			@media (prefers-reduced-motion: reduce) {
				s-playing-card {
					transition: none;
				}
			}
		`,
	];

	select(times = 1): void {
		for (let i = 0; i < times; i += 1) {
			this.publish(shuffled(this.cards).slice(0, this.n));
		}
	}
}
