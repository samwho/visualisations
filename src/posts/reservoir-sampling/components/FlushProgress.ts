import { css } from "lit";
import { customElement, query } from "lit/decorators.js";
import { Progress } from "../../../shared/components/Progress";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import type { TimelineController } from "../../../shared/core/controllers/TimelineController";

@customElement("s-flush-progress")
export class FlushProgress extends Progress {
	@query('[part="fill"]') private fill!: HTMLDivElement;

	private cycle?: Animation;

	static override styles = css`
		${Progress.styles}
		.fill {
			background: var(--color-palette-red-line);
		}
	`;

	/** The batch countdown is decorative; give the host aria-hidden. */
	startCycle(duration: number, timeline: TimelineController): void {
		this.stopCycle();
		if (prefersReducedMotion()) {
			this.value = this.max;
			return;
		}
		this.cycle = this.fill.animate(
			[{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
			{ duration, iterations: Infinity },
		);
		timeline.registerAnimation(this.cycle);
	}

	restartCycle(): void {
		if (this.cycle) {
			this.cycle.currentTime = 0;
		}
	}

	stopCycle(): void {
		this.cycle?.cancel();
		this.cycle = undefined;
		this.value = 0;
	}

	override disconnectedCallback(): void {
		this.cycle?.cancel();
		this.cycle = undefined;
		super.disconnectedCallback();
	}
}
