import { css, html, LitElement } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { prefersReducedMotion } from "../../../shared/Accessibility";
import type { Slider } from "../../../shared/components/Slider";
import { TimelineController } from "../../../shared/core/controllers/TimelineController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import type { SlidingGraphLine } from "../../../shared/components/SlidingGraph";
import { PEAK_EWMA_SMOOTHING, PeakEwma } from "../model/Algorithms";
import { Request } from "./Request";
import "../../../shared/components/BadgedValue";
import "../../../shared/components/Button";
import "../../../shared/components/Card";
import "../../../shared/components/Slider";
import "../../../shared/components/SlidingGraph";
import "./Icon";

const requestIntervalMs = 1000;
const travelMs = 300;
const initialLatencyMs = 500;

interface ActiveRequest {
	element: Request;
	latencyMs: number;
}

interface Point {
	x: number;
	y: number;
}

@customElement("s-exponential-decay")
export class ExponentialDecay extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 100%;
			margin-block: var(--space-5);
		}

		.scene {
			position: relative;
			height: 90px;
			overflow: hidden;
			background: var(--color-surface-default);
		}

		.diagram {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			align-items: center;
			width: 100%;
			height: 100%;
		}

		.node {
			display: grid;
			justify-items: center;
		}

		.load-balancer,
		.server-body {
			width: 50px;
			height: 50px;
			border-radius: 9px;
		}

		.load-balancer {
			background: var(--load-balancer-color);
		}
		.server-body {
			background: var(--server-low-color);
		}

		.request-layer {
			position: absolute;
			inset: 0;
			pointer-events: none;
		}

		.sparkline {
			position: relative;
			border-top: var(--border-width-thin) solid var(--color-border-separator);
		}

		.ewma-badge {
			position: absolute;
			top: 0;
			left: 0;
			z-index: 1;
			display: flex;
			padding: var(--space-2);
			padding-inline-start: calc(var(--space-2) - var(--border-width-thin));
			--badge-font-size: var(--type-caption-size);
			font-family: var(--font-family-code);
		}

		.footer {
			display: grid;
			grid-template-columns: max-content minmax(0, 1fr) var(--control-min-width);
			align-items: center;
			gap: var(--space-3);
			padding: var(--space-2);
		}

		.request-cost {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1);
			color: var(--color-text-primary);
			font: var(--font-size-small) / var(--line-height-tight)
				var(--font-family-code, ui-monospace, monospace);
			white-space: nowrap;
		}

		.request-cost s-icon {
			color: var(--color-palette-green-line);
		}

		s-slider {
			min-width: 0;
		}

		s-button {
			width: var(--control-min-width);
			height: var(--control-min-height);
		}
		s-icon {
			height: var(--icon-size-medium);
		}
	`;

	private readonly visibility = new VisibilityController(this);

	private readonly timeline = new TimelineController(this, this.visibility);

	private readonly peakEwma = new PeakEwma(
		PEAK_EWMA_SMOOTHING,
		initialLatencyMs,
	);

	private readonly active = new Map<number, ActiveRequest>();

	private readonly timeouts = new Set<number>();

	private nextRequestId = 0;

	private interval: number | undefined;

	@query(".scene") private scene!: HTMLElement;

	@query(".load-balancer") private loadBalancer!: HTMLElement;

	@query(".server-body") private server!: HTMLElement;

	@query(".request-layer") private requestLayer!: HTMLElement;

	@state() private processingMs = initialLatencyMs;

	@state() private estimateMs = initialLatencyMs;

	@state() private paused = true;

	private readonly graphLines: readonly SlidingGraphLine[] = [
		{
			id: "ewma",
			label: "EWMA latency",
			read: () => this.estimateMs,
			initial: initialLatencyMs,
			color: "var(--color-palette-blue-line)",
		},
	];

	constructor() {
		super();
		this.visibility.addEventListener("visible", () => this.start());
	}

	override connectedCallback(): void {
		super.connectedCallback();
		if (this.paused) {
			this.timeline.pause();
		} else {
			this.timeline.resume();
		}
	}

	override disconnectedCallback(): void {
		this.stop();
		super.disconnectedCallback();
	}

	private start(): void {
		if (
			this.paused ||
			this.visibility.isHidden ||
			this.interval !== undefined
		) {
			return;
		}
		this.sendRequest();
		this.interval = this.timeline.setInterval(
			() => this.sendRequest(),
			requestIntervalMs,
		);
	}

	private stop(): void {
		if (this.interval !== undefined) {
			this.timeline.clearInterval(this.interval);
		}
		this.interval = undefined;
		for (const timeout of this.timeouts) {
			this.timeline.clearTimeout(timeout);
		}
		this.timeouts.clear();
		for (const { element } of this.active.values()) {
			element.cancelAnimations();
			element.remove();
		}
		this.active.clear();
	}

	private schedule(callback: () => void, delayMs: number): void {
		const timeout = this.timeline.setTimeout(() => {
			this.timeouts.delete(timeout);
			callback();
		}, delayMs);
		this.timeouts.add(timeout);
	}

	private center(element: HTMLElement): Point {
		const scene = this.scene.getBoundingClientRect();
		const rect = element.getBoundingClientRect();
		return {
			x: rect.left - scene.left + rect.width / 2,
			y: rect.top - scene.top + rect.height / 2,
		};
	}

	private sendRequest(): void {
		const id = ++this.nextRequestId;
		const start = this.center(this.loadBalancer);
		const destination = this.center(this.server);
		const element = new Request();
		element.timeline = this.timeline;
		element.status = "travelling";
		element.moveTo(start.x, start.y);
		this.active.set(id, { element, latencyMs: this.processingMs });
		this.requestLayer.append(element);
		void element.updateComplete.then(() => {
			if (!this.active.has(id)) {
				return;
			}
			element.playMotion(
				[
					{ translate: "0px 0px" },
					{
						translate: `${destination.x - start.x}px ${destination.y - start.y}px`,
					},
				],
				{ duration: travelMs, easing: "linear", fill: "both" },
			);
			this.schedule(() => this.startProcessing(id, destination), travelMs);
		});
	}

	private startProcessing(id: number, destination: Point): void {
		const request = this.active.get(id);
		if (!request) {
			return;
		}
		request.element.moveTo(destination.x, destination.y);
		request.element.cancelMotion();
		request.element.status = "processing";
		request.element.playProcessingWipe(
			request.latencyMs,
			prefersReducedMotion(),
		);
		this.schedule(() => this.completeRequest(id), request.latencyMs);
	}

	private completeRequest(id: number): void {
		const request = this.active.get(id);
		if (!request) {
			return;
		}
		request.element.cancelAnimations();
		request.element.remove();
		this.active.delete(id);
		this.peakEwma.update(request.latencyMs);
		this.estimateMs = this.peakEwma.peak;
	}

	private handleSliderInput = (event: Event): void => {
		// SAFETY: this handler is bound to the s-slider below.
		this.processingMs = Number((event.currentTarget as Slider).value);
	};

	private togglePause = (): void => {
		this.paused = !this.paused;
		if (this.paused) {
			this.timeline.pause();
		} else {
			this.timeline.resume();
			this.start();
		}
	};

	protected override render() {
		return html`
			<s-card
				role="group"
				aria-label="EWMA latency estimate"
			>
				<div
					class="scene"
					role="img"
					aria-label="Load balancer sends one request each second to a server"
				>
					<div
						class="diagram"
						aria-hidden="true"
					>
						<div class="node">
							<div class="load-balancer"></div>
						</div>
						<div class="node">
							<div class="server-body"></div>
						</div>
					</div>
					<div
						class="request-layer"
						aria-hidden="true"
					></div>
				</div>
				<div class="sparkline">
					<s-sliding-graph
						.timeline=${this.timeline}
						.lines=${this.graphLines}
						.yMax=${1250}
						label=${`EWMA latency estimate over time, currently ${Math.round(this.estimateMs)} milliseconds`}
					></s-sliding-graph>
					<output
						class="ewma-badge"
						aria-live="off"
						aria-label="EWMA latency estimate"
					>
						<s-badged-value>
							<span slot="label">EWMA</span>
							<span slot="value">${Math.round(this.estimateMs)} ms</span>
						</s-badged-value>
					</output>
				</div>
				<div
					class="footer"
					slot="footer"
				>
					<output
						class="request-cost"
						aria-live="off"
					>
						<s-icon
							name="request"
							aria-hidden="true"
						></s-icon>
						<span>${this.processingMs} ms</span>
					</output>
					<s-slider
						min="200"
						max="1000"
						step="1"
						.value=${String(this.processingMs)}
						label="Request processing time"
						value-text=${`${this.processingMs} milliseconds`}
						@input=${this.handleSliderInput}
					></s-slider>
					<s-button
						label=${this.paused ? "Resume requests" : "Pause requests"}
						@click=${this.togglePause}
					>
						<s-icon
							slot="icon"
							name=${this.paused ? "uncropped-play_fill" : "uncropped-pause_fill"}
							aria-hidden="true"
						></s-icon>
					</s-button>
				</div>
			</s-card>
		`;
	}
}
