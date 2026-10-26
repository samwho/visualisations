import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { prefersReducedMotion } from "../Accessibility";
import { graphMarkerPaths, type GraphMarker } from "../GraphMarkers";
import { FrameController } from "../core/controllers/FrameController";
import { ResizeController } from "../core/controllers/ResizeController";
import { ThemeController } from "../core/controllers/ThemeController";
import { TimelineController } from "../core/controllers/TimelineController";
import { VisibilityController } from "../core/controllers/VisibilityController";

export interface SlidingGraphLine {
	id: string;
	label: string;
	read: () => number;
	initial: number;
	color: string;
	marker?: GraphMarker;
	markerRadius?: number;
	visible?: boolean;
	onSample?: (value: number) => void;
}

export interface SlidingGraphStaticLine {
	value: number;
	color: string;
}

interface Sample {
	time: number;
	values: Record<string, number>;
}

interface TimeMarker {
	time: number;
	color: string;
	resolvedColor: string;
}

class Smoother {
	private value: number;

	private velocity = 0;

	constructor(initial: number) {
		this.value = initial;
	}

	sample(target: number, elapsedMs: number): number {
		const cappedMs = Math.min(elapsedMs, 1000);
		const steps = Math.max(1, Math.ceil(cappedMs / (1000 / 60)));
		const step = cappedMs / (steps * (1000 / 60));
		for (let i = 0; i < steps; i += 1) {
			const delta = target - this.value;
			const acceleration = delta * 2 * (Math.abs(delta) < 0.5 ? delta ** 2 : 1);
			this.velocity = (this.velocity + acceleration * step) * 0.8 ** step;
			this.value += (this.velocity * step) / 60;
		}
		return this.value;
	}
}

@customElement("s-sliding-graph")
export class SlidingGraph extends LitElement {
	@property({ attribute: false }) timeline?: TimelineController;

	@property({ attribute: false }) lines: readonly SlidingGraphLine[] = [];

	@property({ attribute: false })
	staticLines: readonly SlidingGraphStaticLine[] = [];

	@property({ type: Number, attribute: "y-max" }) yMax = 100;

	@property({ type: Number, attribute: "y-min" }) yMin = 0;

	/** Follow recent samples, using yMin as the domain floor. */
	@property({ type: Boolean, attribute: "auto-range" }) autoRange = false;

	@property({ type: Number, attribute: "window-ms" }) windowMs = 10_000;

	@property() label = "Sliding graph";

	private readonly visibility = new VisibilityController(this);

	private readonly smoothers = new Map<string, Smoother>();

	private readonly samples: Sample[] = [];

	private readonly timeMarkers: TimeMarker[] = [];

	private gridYStep = 1;

	private gridXStepMs?: number;

	private width = 600;

	private height = 120;

	private startAt?: number;

	private yRange?: { minimum: number; maximum: number };

	private lastRangeExpansion = 0;

	private frames?: FrameController;

	private timer?: number;

	private canvas?: HTMLCanvasElement;

	private context?: CanvasRenderingContext2D;

	private colorProbe?: HTMLElement;

	private gridColor = "";

	private lineColors = new Map<string, string>();

	private readonly markerPaths = new Map<GraphMarker, Path2D>();

	private staticColors: string[] = [];

	private readonly resolution = 600;

	private readonly rightPaddingSamples = 20;

	constructor() {
		super();
		const resize = new ResizeController(
			this,
			() => this.renderRoot.querySelector("canvas") ?? undefined,
		);
		resize.addEventListener("resize", (event) => {
			// SAFETY: ResizeController emits its ResizeObserverEntry in the event detail.
			const entry = (event as CustomEvent<ResizeObserverEntry>).detail;
			this.width = entry.contentRect.width;
			this.height = entry.contentRect.height;
			this.paint();
		});
		const theme = new ThemeController(this);
		theme.addEventListener("change", () => {
			this.refreshColors();
			this.paint();
		});
		this.visibility.addEventListener("visible", () => this.start());
		this.visibility.addEventListener("hidden", () => this.stop());
	}

	static override styles = css`
		:host {
			display: block;
			width: 100%;
			height: 7.5rem;
		}
		canvas {
			display: block;
			box-sizing: border-box;
			width: 100%;
			height: 100%;
			background: var(--color-surface-default);
			border-color: var(--color-border-subtle);
		}
		.color-probe {
			position: absolute;
			visibility: hidden;
			pointer-events: none;
		}
	`;

	protected override firstUpdated(): void {
		// Grid cells belong to data space, not the animated viewport.
		this.gridYStep = (this.yMax - this.yMin) / 6;
		this.canvas = this.renderRoot.querySelector("canvas") ?? undefined;
		this.context = this.canvas?.getContext("2d") ?? undefined;
		this.colorProbe =
			this.renderRoot.querySelector<HTMLElement>(".color-probe") ?? undefined;
		if (this.canvas) {
			this.width = this.canvas.clientWidth;
			this.height = this.canvas.clientHeight;
		}
		this.syncSmoothers();
		this.refreshColors();
		this.paint();
	}

	protected override updated(changed: PropertyValues<this>): void {
		if (changed.has("autoRange")) {
			this.yRange = undefined;
		}
		if (changed.has("lines")) {
			this.syncSmoothers();
		}
		if (changed.has("lines") || changed.has("staticLines")) {
			this.refreshColors();
		}
		if (changed.has("timeline")) {
			this.stop();
			this.start();
		}
		if (
			changed.has("lines") ||
			changed.has("staticLines") ||
			changed.has("yMax") ||
			changed.has("yMin") ||
			changed.has("autoRange") ||
			changed.has("windowMs")
		) {
			this.paint();
		}
	}

	private syncSmoothers(): void {
		const ids = new Set(this.lines.map((line) => line.id));
		for (const id of this.smoothers.keys()) {
			if (!ids.has(id)) {
				this.smoothers.delete(id);
			}
		}
		for (const line of this.lines) {
			if (!this.smoothers.has(line.id)) {
				this.smoothers.set(line.id, new Smoother(line.initial));
			}
		}
	}

	private resolveColor(color: string): string {
		if (!this.colorProbe) {
			return color;
		}
		this.colorProbe.style.color = color;
		return getComputedStyle(this.colorProbe).color;
	}

	private refreshColors(): void {
		if (!this.canvas || !this.colorProbe) {
			return;
		}
		this.gridColor = getComputedStyle(this.canvas).borderTopColor;
		this.lineColors = new Map(
			this.lines.map((line) => [line.id, this.resolveColor(line.color)]),
		);
		this.staticColors = this.staticLines.map((line) =>
			this.resolveColor(line.color),
		);
		for (const marker of this.timeMarkers) {
			marker.resolvedColor = this.resolveColor(marker.color);
		}
	}

	private start(): void {
		if (
			!this.isConnected ||
			this.visibility.isHidden ||
			!this.timeline ||
			this.frames ||
			this.timer !== undefined
		) {
			return;
		}
		if (prefersReducedMotion()) {
			if (!this.timeline.isPaused()) {
				this.sampleAt(this.timeline.nowMs(), true);
				this.paint();
			}
			// Reduced-motion redraws follow wall time, never simulation speed.
			this.timer = window.setInterval(() => {
				if (
					!this.timeline ||
					this.timeline.isPaused() ||
					this.timeline.getPlaybackRate() === 0
				) {
					return;
				}
				this.sampleAt(this.timeline.nowMs(), true);
				this.paint();
			}, 1000);
			return;
		}
		this.frames = new FrameController(this, this.timeline);
		this.frames.addEventListener("draw", this.draw);
	}

	private stop(): void {
		if (this.timer !== undefined) {
			window.clearInterval(this.timer);
			this.timer = undefined;
		}
		if (this.frames) {
			this.frames.hostDisconnected();
			this.removeController(this.frames);
			this.frames = undefined;
		}
	}

	private readonly draw = (event: Event): void => {
		// SAFETY: FrameController emits draw with the current timeline time.
		const now = (event as CustomEvent<number>).detail;
		if (!this.timeline?.isPaused()) {
			this.sampleAt(now, false);
		}
		this.paint();
	};

	private sampleAt(now: number, reducedMotion: boolean): void {
		this.startAt ??= now;
		const elapsedMs = now - (this.samples.at(-1)?.time ?? now);
		this.pushSample(now, reducedMotion, elapsedMs);
		if (this.autoRange) {
			this.updateRange(now, elapsedMs, reducedMotion);
		}
	}

	private updateRange(
		now: number,
		elapsedMs: number,
		reducedMotion: boolean,
	): void {
		const lines = this.lines.filter((line) => line.visible !== false);
		if (lines.length === 0) {
			return;
		}
		let minimum = Number.POSITIVE_INFINITY;
		let maximum = Number.NEGATIVE_INFINITY;
		const include = (value: number) => {
			minimum = Math.min(minimum, value);
			maximum = Math.max(maximum, value);
		};

		// Older history may clip: only the latest three seconds steer the camera.
		const cutoff = now - Math.min(3000, this.windowMs);
		for (let index = this.samples.length - 1; index >= 0; index -= 1) {
			const sample = this.samples[index]!;
			if (sample.time < cutoff) {
				break;
			}
			for (const line of lines) {
				const value = sample.values[line.id];
				if (value !== undefined) {
					include(value);
				}
			}
		}
		// Anticipate targets while the plotted lines are still easing towards them.
		for (const line of lines) {
			include(line.read());
		}
		for (const line of this.staticLines) {
			include(line.value);
		}
		const center = (minimum + maximum) / 2;
		// The configured domain is the closest zoom; sparse data must not magnify it.
		const span = Math.max(
			Math.max(maximum - minimum, Math.abs(center) * 0.5, 1) * 1.4,
			this.yMax - this.yMin,
		);
		const targetMinimum = Math.max(this.yMin, center - span / 2);
		const targetMaximum = targetMinimum + span;
		if (!this.yRange) {
			this.yRange = { minimum: targetMinimum, maximum: targetMaximum };
			this.lastRangeExpansion = now;
			return;
		}
		const expandMinimum = targetMinimum < this.yRange.minimum;
		const expandMaximum = targetMaximum > this.yRange.maximum;
		if (expandMinimum || expandMaximum) {
			this.lastRangeExpansion = now;
		}
		// Hold each inward-moving edge while peaks are still arriving.
		const canContract = now - this.lastRangeExpansion >= 3000;
		const blend = (expanding: boolean) =>
			reducedMotion
				? 1
				: -Math.expm1(-Math.min(elapsedMs, 1000) / (expanding ? 250 : 1800));

		if (expandMinimum || canContract) {
			this.yRange.minimum +=
				(targetMinimum - this.yRange.minimum) * blend(expandMinimum);
		}
		if (expandMaximum || canContract) {
			this.yRange.maximum +=
				(targetMaximum - this.yRange.maximum) * blend(expandMaximum);
		}
	}

	private pushSample(
		time: number,
		reducedMotion: boolean,
		elapsedMs: number,
	): void {
		const values: Record<string, number> = {};
		for (const line of this.lines) {
			const target = line.read();
			values[line.id] = reducedMotion
				? target
				: this.smoothers.get(line.id)!.sample(target, elapsedMs);
		}
		this.samples.push({ time, values });
		for (const line of this.lines) {
			line.onSample?.(values[line.id]!);
		}
	}

	private paint(): void {
		const canvas = this.canvas;
		const context = this.context;
		if (!canvas || !context || this.width === 0 || this.height === 0) {
			return;
		}
		const scale = window.devicePixelRatio || 1;
		const pixelWidth = Math.round(this.width * scale);
		const pixelHeight = Math.round(this.height * scale);
		if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
			canvas.width = pixelWidth;
			canvas.height = pixelHeight;
			context.setTransform(scale, 0, 0, scale, 0, 0);
		}
		context.clearRect(0, 0, this.width, this.height);
		const now = this.timeline?.nowMs() ?? this.samples.at(-1)?.time ?? 0;
		const start = this.startAt ?? now;
		// Settle the initial camera before playback produces its first sample.
		if (this.autoRange && !this.yRange) {
			this.updateRange(now, 0, true);
		}
		const minimum = this.autoRange
			? (this.yRange?.minimum ?? this.yMin)
			: this.yMin;
		const maximum = this.autoRange
			? (this.yRange?.maximum ?? this.yMax)
			: this.yMax;
		// One camera scale maps both axes: zooming changes the time span too.
		const cellSize = (this.height * this.gridYStep) / (maximum - minimum);
		const gridXStepMs = (this.gridXStepMs ??=
			(this.windowMs * this.height) / (this.width * 6));
		const visibleWindowMs = (this.width / cellSize) * gridXStepMs;
		// Keep another viewport off the left edge for subsequent zoom-outs.
		const historyCutoff = now - visibleWindowMs * 2;
		while (this.samples[1] && this.samples[1].time < historyCutoff) {
			this.samples.shift();
		}
		const fillDuration =
			(visibleWindowMs * (this.resolution - this.rightPaddingSamples)) /
			this.resolution;
		const left = Math.max(start, now - fillDuration);
		const xFor = (time: number) => ((time - left) / gridXStepMs) * cellSize;

		const yFor = (value: number) =>
			this.height - ((value - minimum) / this.gridYStep) * cellSize;

		// Drop the same subdivisions on both axes at extreme zoom-out levels.
		const stride = 2 ** Math.max(0, Math.ceil(Math.log2(8 / cellSize)));
		const timeStep = gridXStepMs * stride;
		const valueStep = this.gridYStep * stride;
		context.strokeStyle = this.gridColor;
		context.lineWidth = 0.5;
		context.beginPath();
		for (
			let time = Math.ceil(left / timeStep) * timeStep;
			time <= left + visibleWindowMs;
			time += timeStep
		) {
			const x = xFor(time);
			context.moveTo(x, 0);
			context.lineTo(x, this.height);
		}
		for (
			let value = Math.ceil(minimum / valueStep) * valueStep;
			value <= maximum;
			value += valueStep
		) {
			const y = yFor(value);
			context.moveTo(0, y);
			context.lineTo(this.width, y);
		}
		context.stroke();

		while (this.timeMarkers[0] && this.timeMarkers[0].time < historyCutoff) {
			this.timeMarkers.shift();
		}
		context.lineWidth = 1;
		for (const marker of this.timeMarkers) {
			const x = xFor(marker.time);
			context.strokeStyle = marker.resolvedColor;
			context.beginPath();
			context.moveTo(x, 0);
			context.lineTo(x, this.height);
			context.stroke();
		}

		for (const [index, line] of this.staticLines.entries()) {
			context.strokeStyle = this.staticColors[index]!;
			context.lineWidth = 2;
			context.beginPath();
			context.moveTo(0, yFor(line.value));
			context.lineTo(this.width, yFor(line.value));
			context.stroke();
		}
		// Keep stroke padding and a preceding point so clipped joins stay intact.
		const cutoff = left - (2 * gridXStepMs) / cellSize;
		const samples = this.samples;
		const sampleCount = samples.length;
		let firstVisible = 0;
		while (
			firstVisible + 1 < sampleCount &&
			samples[firstVisible + 1]!.time < cutoff
		) {
			firstVisible += 1;
		}
		for (const line of this.lines) {
			if (line.visible === false) {
				continue;
			}
			const id = line.id;
			context.strokeStyle = this.lineColors.get(id) ?? "";
			context.lineWidth = 2;
			context.lineCap = "round";
			context.lineJoin = "round";
			context.beginPath();
			let hasPoint = false;
			let lastX = 0;
			let lastY = 0;
			let first = firstVisible;
			while (first > 0 && samples[first]!.values[id] === undefined) {
				first -= 1;
			}
			for (let index = first; index < sampleCount; index += 1) {
				const sample = samples[index]!;
				const value = sample.values[id];
				if (value === undefined) {
					continue;
				}
				const x = xFor(sample.time);
				const y = yFor(value);
				if (hasPoint) {
					context.lineTo(x, y);
				} else {
					context.moveTo(x, y);
				}
				hasPoint = true;
				lastX = x;
				lastY = y;
			}
			if (!hasPoint) {
				continue;
			}
			context.stroke();
			context.fillStyle = this.lineColors.get(id) ?? "";
			const markerKind = line.marker ?? "circle";
			let marker = this.markerPaths.get(markerKind);
			if (!marker) {
				marker = new Path2D(graphMarkerPaths[markerKind]);
				this.markerPaths.set(markerKind, marker);
			}
			const radius = line.markerRadius ?? 3;
			context.save();
			context.translate(lastX, lastY);
			context.scale(radius, radius);
			context.fill(marker);
			context.restore();
		}
	}

	/** Stamp the shared timeline; the marker pans with the sampled history. */
	addTimeMarker(color: string): void {
		const time = this.timeline?.nowMs() ?? 0;
		this.startAt ??= time;
		const marker = { time, color, resolvedColor: this.resolveColor(color) };
		// Coincident events while paused share one visible stroke.
		if (this.timeMarkers.at(-1)?.time === time) {
			this.timeMarkers[this.timeMarkers.length - 1] = marker;
		} else {
			this.timeMarkers.push(marker);
		}
		this.paint();
	}

	reset(): void {
		this.samples.length = 0;
		this.timeMarkers.length = 0;
		this.startAt = undefined;
		this.yRange = undefined;
		this.smoothers.clear();
		this.syncSmoothers();
		this.paint();
	}

	protected override render() {
		return html`
			<canvas
				role="img"
				aria-label=${this.label}
			></canvas>
			<span
				class="color-probe"
				aria-hidden="true"
			></span>
		`;
	}

	override disconnectedCallback(): void {
		this.stop();
		super.disconnectedCallback();
	}
}
