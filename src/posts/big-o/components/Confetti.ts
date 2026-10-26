import { MediaQueryController } from "../../../shared/core/controllers/MediaQueryController";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { DPRController } from "../../../shared/core/controllers/DPRController";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { PageResizeController } from "../../../shared/core/controllers/PageResizeController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";

const colors = ["orange", "red", "blue", "green", "yellow", "pink"];

// Sample the original cubic-bezier(0.25, 0.46, 0.45, 0.94) flight once,
// rather than solving it separately for every particle on every frame.
const easing = Float32Array.from({ length: 129 }, (_, index) => {
	const x = index / 128;
	let t = x;
	for (let step = 0; step < 6; step++) {
		const inverse = 1 - t;
		const value =
			0.75 * inverse * inverse * t + 1.35 * inverse * t * t + t * t * t;
		const slope = 0.75 * inverse * inverse + 1.2 * inverse * t + 1.65 * t * t;
		t = Math.max(0, Math.min(1, t - (value - x) / slope));
	}
	const inverse = 1 - t;
	return 1.38 * inverse * inverse * t + 2.82 * inverse * t * t + t * t * t;
});

function flightProgress(progress: number): number {
	const sample = progress * 128;
	const index = Math.floor(sample);
	const from = easing[index]!;
	return from + ((easing[index + 1] ?? 1) - from) * (sample - index);
}

@customElement("s-confetti")
export class Confetti extends LitElement {
	private readonly pieces = Array.from({ length: 100 }, () => {
		const startRotation = (Math.random() - 0.5) * 180;
		return {
			circle: Math.random() < 0.5,
			color: Math.floor(Math.random() * colors.length),
			size: 8 + Math.random() * 12,
			left: Math.random() * 100,
			delay: Math.random() * 1500,
			duration: 2000 + Math.random() * 2000,
			drift: (Math.random() - 0.5) * 300,
			startRotation,
			endRotation:
				startRotation +
				(540 + Math.random() * 360) * (Math.random() < 0.5 ? -1 : 1),
		};
	});

	private readonly groups = colors.map((_, index) =>
		this.pieces.filter((piece) => piece.color === index),
	);

	private readonly duration = Math.max(
		...this.pieces.map((piece) => piece.delay + piece.duration),
	);

	private canvas?: HTMLCanvasElement;

	private context?: CanvasRenderingContext2D;

	private readonly frames = new FrameController(this);

	private preparationFrames = 1;

	private start = 0;

	private width = 0;

	private height = 0;

	private paintColors: string[] = [];

	private readonly motion = new MediaQueryController(
		this,
		"(prefers-reduced-motion: reduce)",
	);

	constructor() {
		super();
		this.motion.addEventListener("change", this.stopWhenHidden);
		this.frames.addEventListener("draw", () => {
			if (this.context) {
				this.draw();
			} else if (this.preparationFrames-- > 0) {
				this.frames.requestDraw();
			} else {
				this.initialize();
			}
		});
		const page = new PageResizeController(this);
		page.addEventListener("resize", () =>
			this.frames.requestDrawWith(this.resize),
		);
		const theme = new ThemeController(this);
		theme.addEventListener("change", () => this.readColors());
		const dpr = new DPRController(this);
		dpr.addEventListener("change", () =>
			this.frames.requestDrawWith(this.resize),
		);
		const visibility = new VisibilityController(this);
		visibility.addEventListener("hidden", () => this.remove());
	}

	static override styles = css`
		:host {
			position: fixed;
			inset: 0;
			pointer-events: none;
			overflow: hidden;
			contain: strict;
			z-index: 1000;
			display: block;
		}
		canvas {
			display: block;
			width: 100%;
			height: 100%;
		}
	`;

	protected override firstUpdated(): void {
		if (!this.isConnected || document.hidden || prefersReducedMotion()) {
			this.remove();
			return;
		}
		// Let the win header and buttons paint before allocating the canvas.
		this.frames.requestDraw();
	}

	private readonly initialize = (): void => {
		if (!this.isConnected || document.hidden || prefersReducedMotion()) {
			this.remove();
			return;
		}
		this.canvas = this.renderRoot.querySelector("canvas")!;
		this.context = this.canvas.getContext("2d") ?? undefined;
		if (!this.context) {
			this.remove();
			return;
		}
		this.readColors();
		this.resize();
		this.frames.timeline.resume();
		this.start = this.frames.timeline.nowMs();
	};

	private readColors(): void {
		if (!this.context) {
			return;
		}
		const style = getComputedStyle(this);
		this.paintColors = colors.map((color) =>
			style.getPropertyValue(`--color-data-fill-${color}`).trim(),
		);
	}

	private readonly resize = (): void => {
		if (!this.canvas || !this.context) {
			return;
		}
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		const scale = window.devicePixelRatio;
		this.canvas.width = Math.round(this.width * scale);
		this.canvas.height = Math.round(this.height * scale);
		this.context.setTransform(scale, 0, 0, scale, 0, 0);
	};

	private readonly draw = (): void => {
		const context = this.context!;
		const elapsed = this.frames.timeline.nowMs() - this.start;
		if (elapsed >= this.duration) {
			this.remove();
			return;
		}
		context.clearRect(0, 0, this.width, this.height);
		for (const [index, group] of this.groups.entries()) {
			context.fillStyle = this.paintColors[index]!;
			for (const piece of group) {
				const phase = (elapsed - piece.delay) / piece.duration;
				if (phase < 0 || phase >= 1) {
					continue;
				}
				const progress = flightProgress(phase);
				const radius = piece.size / 2;
				const x =
					(piece.left / 100) * this.width + piece.drift * progress + radius;
				const y = -10 + (-0.15 + 1.25 * progress) * this.height + radius;
				if (
					y + piece.size < 0 ||
					y - piece.size > this.height ||
					x + piece.size < 0 ||
					x - piece.size > this.width
				) {
					continue;
				}
				context.globalAlpha = Math.min(
					progress / 0.1,
					(1 - progress) / 0.01,
					1,
				);
				context.beginPath();
				if (piece.circle) {
					context.arc(x, y, radius, 0, Math.PI * 2);
				} else {
					const rotation =
						((piece.startRotation +
							(piece.endRotation - piece.startRotation) * progress) *
							Math.PI) /
						180;
					context.save();
					context.translate(x, y);
					context.rotate(rotation);
					context.roundRect(-radius, -radius, piece.size, piece.size, 2);
					context.fill();
					context.restore();
					continue;
				}
				context.fill();
			}
		}
	};

	private readonly stopWhenHidden = (): void => {
		if (document.hidden || prefersReducedMotion()) {
			this.remove();
		}
	};

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.frames.timeline.pause();
		if (this.canvas) {
			this.canvas.width = 0;
			this.canvas.height = 0;
			this.canvas = undefined;
		}
		this.context = undefined;
	}

	protected override render() {
		return html`<canvas aria-hidden="true"></canvas>`;
	}
}
