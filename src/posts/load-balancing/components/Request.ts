import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import type { TimelineController } from "../../../shared/core/controllers/TimelineController";
import {
	REQUEST_COLOUR_UPDATE_INTERVAL,
	REQUEST_ENTRY_DURATION,
} from "../globals";

const REQUEST_COLOR_DURATION = 10_000;
const REQUEST_ENTRY_START_SCALE = 0.6;
const PROCESSING_WIPE_ANIMATION_ID = "processing-wipe";
const PROCESSING_LEFT_KEYFRAMES: Keyframe[] = [
	{ transform: "rotate(0deg)" },
	{ transform: "rotate(-180deg)", offset: 0.5 },
	{ transform: "rotate(-180deg)" },
];
const PROCESSING_RIGHT_KEYFRAMES: Keyframe[] = [
	{ transform: "rotate(0deg)" },
	{ transform: "rotate(0deg)", offset: 0.5 },
	{ transform: "rotate(-180deg)" },
];

const PROCESSING_FADE_KEYFRAMES: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];

const REQUEST_ENTRY_KEYFRAMES: Keyframe[] = [
	{
		opacity: 0,
		transform: `translate(-50%, -50%) scale(${REQUEST_ENTRY_START_SCALE})`,
	},
	{ opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
];

export type RequestVisualStatus =
	| "travelling"
	| "processing"
	| "queued"
	| "dropped";

@customElement("s-request")
export class Request extends LitElement {
	static override styles = css`
		:host {
			--request-x: 0px;
			--request-y: 0px;
			/* Age drives the colour, not the theme. */
			--request-color: color-mix(
				in oklch,
				var(--color-data-fill-green),
				var(--color-data-fill-red) var(--request-age, 0%)
			);
			--request-border-color: color-mix(
				in oklch,
				var(--color-palette-green-border),
				var(--color-palette-red-border) var(--request-age, 0%)
			);
			display: block;
			position: absolute;
			inset: 0;
			width: 0;
			height: 0;
			z-index: 3;
			pointer-events: none;
			transform: translate(var(--request-x), var(--request-y));
			transform-origin: var(--request-x) var(--request-y);
		}

		:host([status="dropped"]) {
			opacity: 0.75;
			z-index: 4;
		}

		.request-dot {
			position: absolute;
			inset: 0;
			box-sizing: border-box;
			width: 20px;
			height: 20px;
			border: var(--border-width-thin) solid var(--request-border-color);
			border-radius: var(--radius-circle);
			background: var(--request-color);
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.6);
			box-shadow: 0 0 0.5px var(--request-border-color);
		}

		.request-dot.processing-wipe {
			background: none;
			border: none;
			box-shadow: none;
		}

		.wipe-half {
			display: none;
			position: absolute;
			top: 0;
			width: 10px;
			height: 20px;
			overflow: hidden;
		}

		.processing-wipe > .wipe-half {
			display: block;
		}

		.wipe-left {
			left: 0;
		}
		.wipe-right {
			left: 10px;
		}

		.wipe-circle {
			position: absolute;
			top: 0;
			width: 20px;
			height: 20px;
			box-sizing: border-box;
			border-radius: var(--radius-circle);
			background: var(--request-color);
			border: var(--border-width-thin) solid var(--request-border-color);
			box-shadow: 0 0 0.5px var(--request-border-color);
		}

		.wipe-left .wipe-circle {
			left: 0;
			clip-path: inset(0 50% 0 0);
		}

		.wipe-right .wipe-circle {
			left: -10px;
			clip-path: inset(0 0 0 50%);
		}
	`;

	@property({ type: String, reflect: true })
	status: RequestVisualStatus = "travelling";

	@property({ attribute: false })
	timeline?: TimelineController;

	private processingWipeAnimations: Animation[] = [];

	private processingWipeCircles: readonly Element[] = [];

	private entryAnimation: Animation | null = null;

	private colourTimer?: number;

	private motionAnimation: Animation | null = null;

	protected override firstUpdated(): void {
		this.playEntryAnimation();
		this.animateColour();
	}

	get visualElement(): HTMLElement | null {
		return this.renderRoot.querySelector<HTMLElement>(".request-dot");
	}

	moveTo(x: number, y: number): void {
		this.style.setProperty("--request-x", `${x}px`);
		this.style.setProperty("--request-y", `${y}px`);
	}

	setDropped(): void {
		this.status = "dropped";
		// Dropping may cancel the entry fade before it saves the visible state.
		const dot = this.visualElement;
		if (dot) {
			dot.style.opacity = "1";
			dot.style.transform = "translate(-50%, -50%) scale(1)";
		}
		this.stopColourUpdates();
		this.style.setProperty("--request-color", "var(--color-data-fill-red)");
		this.style.setProperty(
			"--request-border-color",
			"var(--color-palette-red-border)",
		);
	}

	playProcessingWipe(
		duration: number,
		reducedMotion: boolean,
	): Animation | null {
		const dot = this.visualElement;
		if (!dot) {
			return null;
		}

		this.cancelProcessingWipe();
		const options: KeyframeAnimationOptions = {
			duration,
			easing: "linear",
			fill: "both",
		};
		if (reducedMotion) {
			this.processingWipeAnimations = [
				this.registerAnimation(dot.animate(PROCESSING_FADE_KEYFRAMES, options)),
			];
		} else {
			// Attach both clipped halves before animate() can resolve their styles.
			if (this.processingWipeCircles.length === 0) {
				const halves = [
					this.createWipeHalf("left"),
					this.createWipeHalf("right"),
				];
				dot.append(...halves);
				this.processingWipeCircles = halves.map(
					(half) => half.firstElementChild!,
				);
			}
			dot.classList.add("processing-wipe");
			this.processingWipeAnimations = this.processingWipeCircles.map(
				(circle, index) =>
					this.registerAnimation(
						circle.animate(
							index === 0
								? PROCESSING_LEFT_KEYFRAMES
								: PROCESSING_RIGHT_KEYFRAMES,
							options,
						),
					),
			);
		}
		const completion = this.processingWipeAnimations.at(-1)!;
		completion.id = PROCESSING_WIPE_ANIMATION_ID;
		return completion;
	}

	playMotion(
		keyframes: Keyframe[],
		options: KeyframeAnimationOptions,
		id?: string,
	): Animation {
		this.cancelMotion();
		const animation = this.animate(keyframes, options);
		if (id !== undefined && id !== "") {
			animation.id = id;
		}
		this.motionAnimation = this.registerAnimation(animation);
		void animation.finished.then(
			() => this.clearMotion(animation),
			() => this.clearMotion(animation),
		);
		return animation;
	}

	get hasMotion(): boolean {
		return this.motionAnimation !== null;
	}

	cancelMotion(): void {
		this.motionAnimation?.cancel();
		this.motionAnimation = null;
	}

	cancelAnimations(): void {
		this.cancelProcessingWipe();
		this.entryAnimation?.cancel();
		this.entryAnimation = null;
		this.stopColourUpdates();
		this.cancelMotion();
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		// Requests are reparented as they travel through the simulation. Custom
		// elements receive a disconnect/connect pair for that move, so defer real
		// cleanup until the element has remained detached for the current turn.
		queueMicrotask(() => {
			if (this.isConnected) {
				return;
			}
			this.cancelAnimations();
		});
	}

	private registerAnimation(animation: Animation): Animation {
		this.timeline?.registerAnimation(animation);
		return animation;
	}

	private createWipeHalf(side: "left" | "right"): HTMLElement {
		const half = document.createElement("span");
		half.className = `wipe-half wipe-${side}`;
		const circle = document.createElement("span");
		circle.className = "wipe-circle";
		half.append(circle);
		return half;
	}

	private cancelProcessingWipe(): void {
		for (const animation of this.processingWipeAnimations) {
			animation.cancel();
		}
		this.processingWipeAnimations = [];
		const dot = this.visualElement;
		dot?.classList.remove("processing-wipe");
	}

	private clearMotion(animation: Animation): void {
		if (this.motionAnimation === animation) {
			this.motionAnimation = null;
		}
	}

	private playEntryAnimation(): void {
		const dot = this.visualElement;
		if (!dot || this.entryAnimation) {
			return;
		}
		if (prefersReducedMotion()) {
			dot.style.opacity = "1";
			dot.style.transform = "translate(-50%, -50%) scale(1)";
			return;
		}
		const animation = dot.animate(REQUEST_ENTRY_KEYFRAMES, {
			duration: REQUEST_ENTRY_DURATION,
			easing: "cubic-bezier(0.23, 1, 0.32, 1)",
			fill: "both",
		});
		this.entryAnimation = this.registerAnimation(animation);
		void animation.finished.then(
			() => this.finishEntryAnimation(animation),
			() => this.clearEntryAnimation(animation),
		);
	}

	private finishEntryAnimation(animation: Animation): void {
		if (this.entryAnimation !== animation) {
			return;
		}
		const dot = this.visualElement;
		if (dot) {
			dot.style.opacity = "1";
			dot.style.transform = "translate(-50%, -50%) scale(1)";
		}
		this.clearEntryAnimation(animation);
		animation.cancel();
	}

	private clearEntryAnimation(animation: Animation): void {
		if (this.entryAnimation === animation) {
			this.entryAnimation = null;
		}
	}

	private animateColour(): void {
		const clock = this.timeline;
		if (!clock || this.colourTimer !== undefined) {
			return;
		}

		// A stepped colour animation still makes the browser sample unsupported
		// border colours every frame. Only change styles when the colour changes.
		const startedAt = clock.nowMs();
		const update = () => {
			this.colourTimer = undefined;
			const age = Math.min(REQUEST_COLOR_DURATION, clock.nowMs() - startedAt);
			const sampledAge =
				Math.floor(age / REQUEST_COLOUR_UPDATE_INTERVAL) *
				REQUEST_COLOUR_UPDATE_INTERVAL;
			this.style.setProperty(
				"--request-age",
				`${(sampledAge / REQUEST_COLOR_DURATION) * 100}%`,
			);
			if (age < REQUEST_COLOR_DURATION) {
				this.colourTimer = clock.setTimeout(
					update,
					sampledAge + REQUEST_COLOUR_UPDATE_INTERVAL - age,
				);
			}
		};

		this.colourTimer = clock.setTimeout(update, REQUEST_COLOUR_UPDATE_INTERVAL);
	}

	private stopColourUpdates(): void {
		if (this.colourTimer !== undefined) {
			this.timeline?.clearTimeout(this.colourTimer);
			this.colourTimer = undefined;
		}
	}

	protected override render() {
		return html`<div class="request-dot"></div>`;
	}
}
