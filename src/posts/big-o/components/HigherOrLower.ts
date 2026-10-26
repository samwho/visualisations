import { MediaQueryController } from "../../../shared/core/controllers/MediaQueryController";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { narrowRange } from "../runtime/BinarySearch";
import "./Icon";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { Confetti } from "./Confetti";
import "../../../shared/components/Card";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";

@customElement("s-higher-or-lower")
export class HigherOrLower extends LitElement {
	constructor() {
		super();
		this.motion.addEventListener("change", this.stopReducedMotion);
		this.frames.addEventListener("update", this.tickNumber);
		this.visibility.addEventListener("hidden", () => {
			this.finishNumber();
			this.stopRangeMotion();
			this.celebration?.remove();
			this.requestUpdate();
		});
		this.visibility.addEventListener("visible", () => this.requestUpdate());
	}

	@state() private guess = 50;

	@state() private done = false;

	@state() private displayedGuess = 50;

	@state() private animating = false;

	private readonly frames = new FrameController(this);

	private numberTransition?: { from: number; to: number; start: number };

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	private celebration?: Confetti;

	private readonly visibility = new VisibilityController(this);

	private min = 1;

	private max = 100;

	static override styles = css`
		:host {
			display: block;
			width: 100%;
			contain: layout style paint;
		}
		.guess {
			display: grid;
			justify-items: center;
			gap: var(--space-4);
			padding: var(--space-5);
		}
		p {
			margin: 0;
			text-align: center;
		}
		.title {
			padding: var(--space-3);
			font-size: var(--type-body-size);
			font-weight: var(--font-weight-bold);
		}
		output {
			font-size: var(--font-size-display-xxlarge);
			font-family: var(--font-family-code);
			font-weight: var(--font-weight-bold);
			line-height: var(--line-height-solid);
		}
		.buttons {
			display: flex;
			gap: var(--space-2);
			flex-wrap: wrap;
			justify-content: space-between;
			align-items: center;
		}
		.choices {
			display: flex;
			gap: var(--space-2);
		}
		.remaining-range {
			position: relative;
			height: var(--space-2);
			margin: 0 var(--space-4) var(--space-4);
			border-radius: var(--radius-pill);
			overflow: clip;
			background: var(--color-progress-track);
		}
		.remaining {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			transform-origin: left center;
			background: var(--color-progress-fill);
		}
		@media (prefers-reduced-motion: no-preference) {
			.remaining-range.animated .remaining {
				transition: transform 200ms ease-out;
			}
		}
		.buttons > s-button {
			margin-inline-start: auto;
		}
	`;

	private readonly stopReducedMotion = (): void => {
		if (this.motion?.matches) {
			this.finishNumber();
			this.stopRangeMotion();
			this.celebration?.remove();
		}
	};

	private stopRangeMotion(): void {
		for (const animation of this.renderRoot
			.querySelector(".remaining")
			?.getAnimations() ?? []) {
			animation.cancel();
		}
	}

	protected override render() {
		const lower = this.done ? this.guess : this.min;
		const upper = this.done ? this.guess : this.max;
		return html`
			<s-card>
				<p
					class="title"
					slot="header"
				>
					${this.done ? (this.guess === 69 ? "Nice." : "Got it! 🎉") : "Is your number..."}
				</p>
				<div class="guess">
					<output
						aria-live="polite"
						aria-busy=${String(this.animating)}
						>${this.displayedGuess}</output
					>
				</div>
				<div
					class=${this.visibility.isHidden ? "remaining-range" : "remaining-range animated"}
					role="img"
					aria-label=${`Remaining possibilities: ${lower} to ${upper}`}
				>
					<span
						class="remaining"
						style=${styleMap({
							// Each of the 100 valid integers occupies one percent of the track.
							transform: `translateX(${lower - 1}%) scaleX(${(upper - lower + 1) / 100})`,
						})}
					></span>
				</div>
				<div
					class="buttons"
					slot="footer"
				>
					<div class="choices">
						<s-button
							variant="danger"
							?disabled=${this.done || this.min >= this.guess}
							@click=${() => this.next(false)}
							><s-icon
								slot="icon"
								name="down"
								aria-hidden="true"
							></s-icon>
							Lower</s-button
						>
						<s-button
							variant="accent"
							?disabled=${this.done || this.max <= this.guess}
							@click=${() => this.next(true)}
							><s-icon
								slot="icon"
								name="up"
								aria-hidden="true"
							></s-icon>
							Higher</s-button
						>
					</div>
					<s-button
						variant=${this.done ? "info" : "success"}
						@click=${this.done ? this.reset : this.win}
						>${this.done ? "Play Again" : "Correct!"}</s-button
					>
				</div>
			</s-card>
		`;
	}

	private next(higher: boolean): void {
		({ min: this.min, max: this.max } = narrowRange(
			this.min,
			this.max,
			higher,
		));
		this.guess = Math.floor((this.min + this.max) / 2);
		this.done = this.min === this.max;
		this.animateNumber();
		if (this.done) {
			this.celebrate();
		}
	}

	private readonly win = (): void => {
		this.done = true;
		this.finishNumber();
		this.celebrate();
	};

	private celebrate(): void {
		this.celebration?.remove();
		if (
			!this.isConnected ||
			this.visibility.isHidden ||
			prefersReducedMotion()
		) {
			return;
		}
		this.celebration = new Confetti();
		this.celebration.setAttribute("aria-hidden", "true");
		document.body.append(this.celebration);
	}

	private animateNumber(): void {
		this.frames.timeline.pause();
		if (prefersReducedMotion() || this.visibility.isHidden) {
			this.finishNumber();
			return;
		}
		const from = this.displayedGuess;
		const to = this.guess;
		this.frames.timeline.resume();
		this.numberTransition = { from, to, start: this.frames.timeline.nowMs() };
		this.animating = true;
	}

	private readonly tickNumber = (event: Event): void => {
		const transition = this.numberTransition;
		if (!transition) {
			return;
		}
		// SAFETY: this handler receives only FrameController's update events.
		const now = (event as CustomEvent<{ nowMs: number }>).detail.nowMs;
		const progress = Math.min(1, (now - transition.start) / 200);
		this.displayedGuess = Math.round(
			transition.from + (transition.to - transition.from) * progress,
		);
		if (progress === 1) {
			this.finishNumber();
		}
	};

	private finishNumber(): void {
		this.frames.timeline.pause();
		this.numberTransition = undefined;
		this.animating = false;
		this.displayedGuess = this.guess;
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.finishNumber();
		this.stopRangeMotion();
		this.celebration?.remove();
	}

	private readonly reset = (): void => {
		this.celebration?.remove();
		this.celebration = undefined;
		this.min = 1;
		this.max = 100;
		this.guess = 50;
		this.done = false;
		this.finishNumber();
	};
}
