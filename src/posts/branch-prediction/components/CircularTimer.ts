import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { FrameController } from "../../../shared/core/controllers/FrameController";

type Point = { x: number; y: number };

@customElement("s-circular-timer")
export class CircularTimer extends LitElement {
	static override styles = css`
		:host {
			display: inline-block;
			inline-size: 1em;
			block-size: 1em;
			color: currentColor;
		}

		svg {
			inline-size: 100%;
			block-size: 100%;
			display: block;
		}
	`;

	@property({ type: Number })
	interval = 1000;

	@property({ type: Boolean, reflect: true })
	repeating = false;

	@property({ type: Boolean })
	paused = false;

	@state()
	private path = "";

	@state()
	private opacity = 0;

	private readonly frames = new FrameController(this);

	constructor() {
		super();
		// SAFETY: FrameController update events carry timeline time and delta.
		this.frames.addEventListener("update", (event) =>
			this.tick((event as CustomEvent<{ nowMs: number }>).detail.nowMs),
		);
	}

	private startTime = 0;

	private hasInitialized = false;

	protected override updated(changed: Map<string, unknown>): void {
		if (
			!this.hasInitialized ||
			changed.has("interval") ||
			changed.has("repeating")
		) {
			this.hasInitialized = true;
			this.restart();
		} else if (changed.has("paused")) {
			if (this.paused) {
				this.stop();
			} else {
				this.frames.timeline.resume();
			}
		}
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.stop();
	}

	private restart() {
		this.stop();
		if (this.interval <= 0) {
			this.updatePath(0);
			return;
		}
		this.startTime = this.frames.timeline.nowMs();
		this.updatePath(1);
		this.emitTimerStart();
		if (!this.paused) {
			this.frames.timeline.resume();
		}
	}

	private stop() {
		this.frames.timeline.pause();
	}

	private tick = (now: number) => {
		const elapsed = now - this.startTime;
		const remaining = Math.max(0, this.interval - elapsed);
		const progress = remaining / this.interval;

		this.updatePath(progress);

		if (remaining <= 0) {
			this.dispatchEvent(
				new CustomEvent("timerend", { bubbles: true, composed: true }),
			);
			if (this.repeating) {
				this.startTime = now;
				this.updatePath(1);
				this.emitTimerStart();
			} else {
				this.stop();
			}
		}
	};

	private updatePath(progress: number) {
		if (progress <= 0) {
			this.path = "";
			this.opacity = 0;
			return;
		}

		if (progress >= 1) {
			this.path = CircularTimer.fullCirclePath();
			this.opacity = 1;
			return;
		}

		const startAngle = -Math.PI / 2;
		const endAngle = startAngle + progress * Math.PI * 2;
		const start = CircularTimer.polarToCartesian(50, 50, 50, startAngle);
		const end = CircularTimer.polarToCartesian(50, 50, 50, endAngle);
		const largeArcFlag = progress > 0.5 ? 1 : 0;

		this.path = `M 50 50 L ${start.x} ${start.y} A 50 50 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
		this.opacity = 1;
	}

	private emitTimerStart() {
		this.dispatchEvent(
			new CustomEvent("timerstart", { bubbles: true, composed: true }),
		);
	}

	private static polarToCartesian(
		cx: number,
		cy: number,
		radius: number,
		angle: number,
	): Point {
		return {
			x: Math.round((cx + radius * Math.cos(angle)) * 1000) / 1000,
			y: Math.round((cy + radius * Math.sin(angle)) * 1000) / 1000,
		};
	}

	private static fullCirclePath(): string {
		return "M 50 50 m -50 0 a 50 50 0 1 0 100 0 a 50 50 0 1 0 -100 0";
	}

	protected override render() {
		return html`
			<svg
				viewBox="0 0 100 100"
				aria-hidden="true"
			>
				<path
					d=${this.path}
					fill="currentColor"
					opacity=${this.opacity}
				></path>
			</svg>
		`;
	}
}
