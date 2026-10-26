import { css, html, LitElement, type PropertyValues, svg } from "lit";
import { state } from "lit/decorators.js";
import { ResizeController } from "../core/controllers/ResizeController";
import { VisibilityController } from "../core/controllers/VisibilityController";
import {
	GraphGeometry,
	placeEndpointLabels,
	SCRUBBABLE_GRAPH_HEIGHT,
	THUMB_RADIUS,
} from "../core/ScrubbableGraphLayout";
import "./Card";
import type { Slider } from "./Slider";
import "./Slider";

export interface GraphAxis {
	label: string;
	maximum: number;
	format(value: number): string;
}
export interface GraphSeries {
	name: string;
	color: string;
	labelColor: string;
	y(x: number): number;
}
/** The caller supplies numbered line colours and matching `-text` foregrounds. */
export function graphSeries(
	lines: readonly { label: string; color: number; y(x: number): number }[],
	palettePrefix: string,
): GraphSeries[] {
	return lines.map((line) => {
		const color = `var(${palettePrefix}-${line.color + 1})`;
		return {
			name: line.label,
			y: line.y,
			color,
			labelColor: `var(${palettePrefix}-${line.color + 1}-text)`,
		};
	});
}

export interface ScrubbableGraphDefinition {
	title: string;
	x: GraphAxis;
	y: GraphAxis;
	series: readonly GraphSeries[];
	formatThumb(value: number): string;
}
interface Endpoint {
	series: GraphSeries;
	value: number;
	cy: number;
	labelY: number;
}

/** Shared annotated plot. Subclasses provide data and wording, never rendering branches. */
export abstract class ScrubbableGraph extends LitElement {
	protected abstract get definition(): ScrubbableGraphDefinition;

	private paths?: string[];

	private ready = false;

	protected override willUpdate(changed: PropertyValues): void {
		// Scrubbing only changes the reveal clip. Resize/data changes rebuild paths.
		if (changed.size !== 1 || !changed.has("progress")) {
			this.paths = undefined;
		}
	}

	@state() private progress = 0;

	private hasInitialProgress = false;

	@state() private width = 480;

	constructor() {
		super();
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => {
			this.width = Math.max(1, this.clientWidth - 2); // container borders
		});
		const visibility = new VisibilityController(this, { rootMargin: "200px" });
		visibility.addEventListener(
			"first-visible",
			() => {
				this.ready = true;
				this.requestUpdate();
			},
			{ once: true },
		);
	}

	static override styles = css`
		:host {
			display: block;
			width: 100%;
		}
		figure {
			margin: 0;
		}
		figcaption {
			background: var(--color-surface-panel);
			border-bottom: var(--border-width-thin) dotted
				var(--color-border-separator);
		}
		h3 {
			margin: 0;
			padding: var(--space-3) var(--space-2);
			text-align: center;
			font: var(--font-weight-bold)
				var(--font-size-small)/ var(--line-height-tight) var(--font-family-code);
		}
		.chart {
			position: relative;
			height: ${SCRUBBABLE_GRAPH_HEIGHT}px;
		}
		svg {
			display: block;
			width: 100%;
			height: 100%;
			font: var(--type-chart-label-size) var(--font-family-code);
			overflow: hidden;
		}
		.grid {
			stroke: var(--color-border-chart);
			stroke-width: 1;
		}
		.background-grid {
			opacity: 0.4;
		}
		text {
			fill: var(--color-text-primary);
		}
		.series {
			fill: none;
			stroke-width: 2;
			stroke-linejoin: round;
			stroke-linecap: round;
		}
		.guide {
			stroke: var(--color-data-neutral);
			stroke-width: 1;
			stroke-dasharray: 3 5;
		}
		.value {
			font-weight: var(--font-weight-bold);
			paint-order: stroke;
			stroke: var(--color-surface-default);
			stroke-width: 5px;
			stroke-linejoin: round;
		}
		.x-value {
			font-size: var(--type-chart-axis-size);
		}
		.y-bound {
			fill: var(--color-text-primary);
			opacity: 0.55;
			font-size: var(--type-chart-label-size);
		}
		s-slider {
			position: absolute;
			width: auto;
		}
	`;

	private endpoints(
		graph: ScrubbableGraphDefinition,
		plot: GraphGeometry,
	): Endpoint[] {
		const values = graph.series.map((series) => series.y(this.progress));
		const positions = placeEndpointLabels(values, plot);
		return graph.series.map((series, index) => ({
			series,
			value: values[index]!,
			cy: Math.max(plot.top, plot.y(values[index]!)),
			labelY: positions[index]!,
		}));
	}

	private linePath(series: GraphSeries, plot: GraphGeometry): string {
		return Array.from({ length: 601 }, (_, index) => {
			// Sample the fixed domain, not the revealed range: otherwise existing
			// steps shift sideways every time the thumb moves.
			const value = (plot.xMaximum * index) / 600;
			const command = index === 0 ? "M" : "L";
			return `${command}${plot.x(value)} ${plot.y(series.y(value))}`;
		}).join(" ");
	}

	private renderGrid(plot: GraphGeometry) {
		return svg`
			<g
				class="background-grid"
				aria-hidden="true"
			>
				${Array.from({ length: 6 }, (_, index) => {
					const x = plot.x((plot.xMaximum * index) / 5);
					return svg`
						<line
							class="grid"
							x1=${x}
							x2=${x}
							y1=${plot.top}
							y2=${plot.bottom}
						></line>
					`;
				})}
				${Array.from({ length: 5 }, (_, index) => {
					const y = plot.y((plot.yMaximum * index) / 4);
					return svg`
					<line
						class="grid"
						x1=${plot.left}
						x2=${plot.left + plot.span}
						y1=${y}
						y2=${y}
					></line>
				`;
				})}
			</g>
		`;
	}

	private formatEndpoint(point: Endpoint, axis: GraphAxis): string {
		const label = `${axis.format(point.value)} (${point.series.name})`;
		if (point.value > axis.maximum) {
			return `↑ ${label}`;
		}
		return label;
	}

	private renderAnnotations(
		graph: ScrubbableGraphDefinition,
		plot: GraphGeometry,
		points: Endpoint[],
	) {
		const cx = plot.x(this.progress);
		const labelX = cx;
		return svg`
			<line
				class="guide"
				x1=${cx}
				x2=${cx}
				y1=${plot.thumbY}
				y2=${Math.min(...points.map((point) => point.cy))}
			></line>
			${points.map(
				(point) => svg`
					<circle
						class="endpoint"
						cx=${cx}
						cy=${point.cy}
						r="3"
						fill=${point.series.color}
						data-value=${point.value}
					></circle>
				`,
			)}
			<text
				class="annotation-heading value"
				x=${cx}
				y=${Math.min(...points.map((point) => point.labelY)) - 25}
				text-anchor="middle"
			>${graph.y.label}</text>
			${points.map(
				(point) => svg`
					<text
						class="value y-value"
						x=${labelX}
						y=${point.labelY}
						text-anchor="middle"
						style=${`fill:${point.series.labelColor}`}
					>${this.formatEndpoint(point, graph.y)}</text>
				`,
			)}
			<text
				class="value x-value"
				x=${cx}
				y=${plot.thumbY - 23}
				text-anchor="middle"
			>${graph.formatThumb(this.progress)}</text>
		`;
	}

	private renderPlot(
		graph: ScrubbableGraphDefinition,
		plot: GraphGeometry,
		points: Endpoint[],
	) {
		if (this.progress !== 0 && !this.paths) {
			this.paths = graph.series.map((series) => this.linePath(series, plot));
		}
		const paths = this.progress === 0 ? [] : this.paths!;
		return svg`
			<svg
				viewBox="0 0 ${plot.width} ${SCRUBBABLE_GRAPH_HEIGHT}"
				role="img"
				aria-label=${`${graph.title}: ${graph.y.label} by ${graph.x.label}`}
			>
				<defs>
					<clipPath id="plot-clip">
						<rect
							x=${plot.left}
							y=${plot.top}
							width=${plot.span}
							height=${plot.bottom - plot.top + 2}
						></rect>
					</clipPath>
					<clipPath id="reveal-clip">
						<rect
							x=${plot.left}
							y=${plot.top}
							width=${plot.x(this.progress) - plot.left}
							height=${plot.bottom - plot.top + 2}
						></rect>
					</clipPath>
				</defs>
				${this.renderGrid(plot)}
				<text
					class="y-bound"
					x=${plot.left}
					y=${plot.top - 7}
					text-anchor="start"
				>${graph.y.format(graph.y.maximum)}</text>
				<text
					class="y-bound"
					x=${plot.left}
					y=${plot.bottom + 15}
					text-anchor="start"
				>${graph.y.format(0)}</text>
				<g clip-path="url(#plot-clip)">
					<g clip-path="url(#reveal-clip)">
						${graph.series.map(
							(series, index) => svg`
								<path
									class="series"
									d=${paths[index] ?? ""}
									stroke=${series.color}
								></path>
							`,
						)}
					</g>
				</g>
				${this.renderAnnotations(graph, plot, points)}
			</svg>
		`;
	}

	private renderSlider(
		graph: ScrubbableGraphDefinition,
		plot: GraphGeometry,
		points: Endpoint[],
	) {
		const values = points
			.map(
				(point) =>
					`${point.series.name}: ${graph.y.format(point.value)} ${graph.y.label}`,
			)
			.join("; ");
		return html`<s-slider
			immediate
			inset-track
			label=${graph.x.label}
			min="0"
			.max=${graph.x.maximum}
			.step=${graph.x.maximum / 1000}
			.keyboardStep=${graph.x.maximum / 100}
			.value=${this.progress}
			style=${`left:${plot.left - THUMB_RADIUS}px;right:${plot.left - THUMB_RADIUS}px;top:${plot.thumbY - THUMB_RADIUS}px`}
			.valueText=${`${graph.formatThumb(this.progress)}; ${values}`}
			@input=${this.handleInput}
		></s-slider>`;
	}

	/** Measure actual glyph bounds, rather than guessing from the slider fraction. */
	private fitLabels = (): void => {
		if (!this.ready) {
			return;
		}
		const labels =
			this.renderRoot.querySelectorAll<SVGTextElement>("text.value");
		const bounds = [
			...this.renderRoot.querySelectorAll<SVGTextElement>(".y-bound"),
		].map((label) => label.getBBox());
		// Finish all layout reads before setting any SVG attributes.
		const measurements = [...labels].map((label) => ({
			label,
			box: label.getBBox(),
		}));
		for (const { label, box } of measurements) {
			const inset = 6; // includes the text's background stroke
			let dx = Math.max(
				inset - box.x,
				Math.min(0, this.width - inset - box.x - box.width),
			);
			const dy = Math.max(
				inset - box.y,
				Math.min(0, SCRUBBABLE_GRAPH_HEIGHT - inset - box.y - box.height),
			);
			// Keep live annotations clear of the two fixed axis values.
			for (const bound of bounds) {
				if (
					box.y + dy < bound.y + bound.height + 3 &&
					box.y + dy + box.height > bound.y - 3 &&
					box.x + dx < bound.x + bound.width + inset &&
					box.x + dx + box.width > bound.x - inset
				) {
					dx = Math.min(
						this.width - inset - box.x - box.width,
						bound.x + bound.width + inset - box.x,
					);
				}
			}
			const transform = `translate(${dx} ${dy})`;
			if (label.getAttribute("transform") !== transform) {
				label.setAttribute("transform", transform);
			}
		}
	};

	protected override updated(): void {
		this.fitLabels();
	}

	override connectedCallback(): void {
		super.connectedCallback();
		if (!this.hasInitialProgress) {
			this.progress = this.definition.x.maximum / 2;
			this.hasInitialProgress = true;
		}
		document.fonts.addEventListener("loadingdone", this.fitLabels);
		void document.fonts.ready.then(() => {
			if (this.isConnected && this.hasUpdated) {
				this.fitLabels();
			}
		});
	}

	override disconnectedCallback(): void {
		document.fonts.removeEventListener("loadingdone", this.fitLabels);
		super.disconnectedCallback();
	}

	private handleInput(event: Event): void {
		this.ready = true;
		// SAFETY: handleInput is bound directly to the graph's s-slider.
		this.progress = Number((event.currentTarget as Slider).value);
		this.requestUpdate();
	}

	protected override render() {
		const graph = this.definition;
		const plot = new GraphGeometry(
			this.width,
			graph.x.maximum,
			graph.y.maximum,
		);
		const points = this.endpoints(graph, plot);
		return html`
			<s-card full-width>
				<figure>
					<figcaption><h3>${graph.title}</h3></figcaption>
					<div
						class="chart"
						aria-busy=${String(!this.ready)}
					>
						${this.ready ? this.renderPlot(graph, plot, points) : null}${this.renderSlider(graph, plot, points)}
					</div>
				</figure>
			</s-card>
		`;
	}
}
