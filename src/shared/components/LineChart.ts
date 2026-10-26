import { css, html, LitElement, nothing, svg } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { ResizeController } from "../core/controllers/ResizeController";
import "./Card";

export type LineTexture = "solid" | "dashed" | "dotted" | "dash-dot";

export interface LineChartPoint {
	x: number;
	y: number;
}

export interface LineChartSeries {
	name: string;
	points: LineChartPoint[];
	color: string;
	texture?: LineTexture;
	areaFill?: boolean;
	legendLabel?: string;
	showInLegend?: boolean;
}

export interface LineChartOptions {
	title: string;
	xAxisTitle: string;
	yAxisTitle: string;
	series: LineChartSeries[];
	height?: number;
	xMinimum?: number;
	xMaximum?: number;
	xTickStep?: number;
	yMinimum?: number;
	yMaximum?: number;
	yTickStep?: number;
	xTickFormat?: (value: number) => string;
	yTickFormat?: (value: number) => string;
	legendPosition?: "top-left" | "top-right";
	smoothLines?: boolean;
}

interface Bounds {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

const DEFAULT_HEIGHT = 400;
const MAX_TICKS = 6;

function textureDasharray(
	texture: LineTexture | undefined,
): string | undefined {
	switch (texture) {
		case "dashed":
			return "8 5";
		case "dotted":
			return "1 5";
		case "dash-dot":
			return "8 4 1 4";
		default:
			return undefined;
	}
}

function tickStep(span: number): number {
	const roughStep = span / (MAX_TICKS - 1);
	const magnitude = 10 ** Math.floor(Math.log10(roughStep));
	const normalized = roughStep / magnitude;
	const multiplier =
		normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	return multiplier * magnitude;
}

function ticks(
	minimum: number,
	maximum: number,
	stepOverride?: number,
): number[] {
	const span = maximum - minimum || 1;
	const step = stepOverride ?? tickStep(span);
	const first = Math.ceil(minimum / step) * step;
	const values: number[] = [];
	for (let value = first; value <= maximum + step / 1000; value += step) {
		values.push(Number(value.toPrecision(12)));
	}
	return values;
}

function roundedCeiling(value: number): number {
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const normalized = value / magnitude;
	const multiplier =
		normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
	return multiplier * magnitude;
}

function formatTick(value: number): string {
	if (Number.isInteger(value)) {
		return String(value);
	}
	return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

@customElement("s-line-chart")
export class LineChart extends LitElement {
	static override styles = css`
		:host {
			display: block;
			width: 100%;
			color: var(--color-text-primary);
		}

		figure {
			margin: 0;
		}

		figcaption {
			background: var(--color-surface-panel);
		}

		.chart-title {
			border-bottom: var(--border-width-thin) dotted
				var(--color-border-separator);
			box-sizing: border-box;
			width: 100%;
			margin: 0;
			padding: 0.625rem var(--space-4);
			border-radius: 0;
			background: var(--color-surface-panel);
			color: var(--color-text-primary);
			font: var(--font-weight-bold)
				var(--font-size-small)/var(--line-height-tight)
				var(--font-family-code, ui-monospace, monospace);
			text-align: center;
		}

		@supports (text-box: trim-both cap alphabetic) {
			.chart-title {
				text-box: trim-both cap alphabetic;
			}
		}

		.line-chart-shell {
			position: relative;
			box-sizing: border-box;
			width: 100%;
			height: var(--line-chart-height, ${DEFAULT_HEIGHT}px);
			padding: var(--space-2) var(--space-2);
			overflow: hidden;
		}

		svg {
			display: block;
			width: 100%;
			height: 100%;
			overflow: visible;
			font-family: var(--font-family-code, ui-monospace, monospace);
		}

		.grid-line,
		.axis-line {
			stroke: var(--color-border-chart);
			shape-rendering: crispEdges;
		}

		.tick-label,
		.axis-title {
			fill: var(--color-text-secondary);
			font-size: var(--type-chart-label-size);
		}

		.axis-title {
			font-size: var(--type-chart-axis-size);
		}

		.series {
			fill: none;
			stroke-linecap: round;
			stroke-linejoin: round;
			stroke-width: 2;
		}

		.series-area {
			stroke: none;
		}

		.legend {
			position: absolute;
			top: var(--space-2);
			right: var(--space-2);
			display: grid;
			gap: var(--space-2);
			margin: 0;
			padding: var(--space-1) var(--space-2);
			color: var(--color-text-secondary);
			font: var(--type-chart-legend-size)/1.1
				var(--font-family-code, ui-monospace, monospace);
			list-style: none;
			background: var(--color-surface-translucent);
			border: var(--border-width-thin) dotted var(--color-border-subtle);
			border-radius: var(--radius-medium);
			pointer-events: none;
		}

		.legend.left {
			left: 4.5rem;
			right: auto;
		}
		.legend[hidden] {
			display: none;
		}

		.legend-item {
			display: grid;
			grid-template-columns: 27px max-content;
			align-items: center;
			gap: var(--space-2);
			white-space: nowrap;
		}

		.legend-swatch {
			width: 27px;
			height: var(--border-width-thick);
			overflow: visible;
		}

		.legend-swatch line {
			stroke: var(--line-color);
			stroke-linecap: round;
			stroke-width: var(--border-width-thick);
		}

		@media (max-width: 21rem) {
			.chart-title {
				font-size: var(--type-chart-legend-size);
				white-space: nowrap;
			}
		}
	`;

	@property({ attribute: false })
	options: LineChartOptions = {
		title: "",
		xAxisTitle: "",
		yAxisTitle: "",
		series: [],
	};

	@property({ type: Boolean, attribute: "full-width" })
	fullWidth = false;

	@state()
	private hasHeader = false;

	@state()
	private hasFooter = false;

	private width = 480;

	constructor() {
		super();
		const resize = new ResizeController(this);
		resize.addEventListener("resize", () => this.handleResize());
	}

	@query("s-card")
	private container?: HTMLElement;

	private handleResize(): void {
		// s-card caps content at 480px on wide screens.
		const width = Math.round(this.container?.clientWidth ?? this.clientWidth);
		if (width > 0 && width !== this.width) {
			this.width = width;
			this.requestUpdate();
		}
	}

	private readonly slotChanged = (event: Event): void => {
		// SAFETY: only the named slots in this template use this listener.
		const slot = event.target as HTMLSlotElement;
		const hasContent = slot
			.assignedNodes()
			.some(
				(node) =>
					node.nodeType === Node.ELEMENT_NODE ||
					(node.nodeType === Node.TEXT_NODE &&
						Boolean(node.textContent?.trim())),
			);
		if (slot.name === "header") {
			this.hasHeader = hasContent;
		} else {
			this.hasFooter = hasContent;
		}
	};

	protected override render() {
		const {
			title,
			xAxisTitle,
			yAxisTitle,
			series,
			height = DEFAULT_HEIGHT,
		} = this.options;
		const legendSeries = series.filter((entry) => entry.showInLegend !== false);
		const width = this.width;
		const bounds: Bounds = { left: 60, right: 16, top: 18, bottom: 38 };
		const points = series.flatMap((entry) => entry.points);
		const xValues = points.map((point) => point.x);
		const yValues = points.map((point) => point.y);
		const xMinimum =
			this.options.xMinimum ?? (xValues.length > 0 ? Math.min(...xValues) : 0);
		const xMaximum =
			this.options.xMaximum ?? (xValues.length > 0 ? Math.max(...xValues) : 1);
		const yMinimum = this.options.yMinimum ?? Math.min(0, ...yValues);
		const yMaximum =
			this.options.yMaximum ?? roundedCeiling(Math.max(1, ...yValues));
		const x = (value: number) =>
			bounds.left +
			((value - xMinimum) / (xMaximum - xMinimum || 1)) *
				(width - bounds.left - bounds.right);

		const y = (value: number) =>
			height -
			bounds.bottom -
			((value - yMinimum) / (yMaximum - yMinimum || 1)) *
				(height - bounds.top - bounds.bottom);

		const xTicks = ticks(xMinimum, xMaximum, this.options.xTickStep);
		const yTicks = ticks(yMinimum, yMaximum, this.options.yTickStep);

		return html`
			<s-card ?full-width=${this.fullWidth}>
				<div
					slot="header"
					?hidden=${!this.hasHeader}
				>
					<slot
						name="header"
						@slotchange=${this.slotChanged}
					></slot>
				</div>
				<figure>
					${
						title
							? html`<figcaption>
									<h3 class="chart-title">${title}</h3>
								</figcaption>`
							: nothing
					}
					<div
						class="line-chart-shell"
						style=${`--line-chart-height: ${height}px`}
					>
						<svg
							viewBox="0 0 ${width} ${height}"
							role="img"
							aria-label="${title}: ${yAxisTitle} by ${xAxisTitle}"
						>
							<defs>
								<clipPath id="plot-clip">
									<rect
										x=${bounds.left}
										y=${bounds.top}
										width=${Math.max(0, width - bounds.left - bounds.right)}
										height=${height - bounds.top - bounds.bottom}
									></rect>
								</clipPath>
								${series.map(
									(entry, index) => svg`
									<linearGradient
										id="area-${index}"
										x1="0"
										x2="0"
										y1="0"
										y2="1"
									>
										<stop
											offset="0"
											stop-color=${entry.color}
											stop-opacity="0.45"
										></stop>
										<stop
											offset="1"
											stop-color=${entry.color}
											stop-opacity="0.08"
										></stop>
									</linearGradient>
								`,
								)}
							</defs>
							${yTicks.map(
								(value) => svg`
								<line
									class="grid-line"
									x1=${bounds.left}
									x2=${width - bounds.right}
									y1=${y(value)}
									y2=${y(value)}
								></line>
								<text
									class="tick-label"
									x=${bounds.left - 7}
									y=${y(value) + 4}
									text-anchor="end"
								>${(this.options.yTickFormat ?? formatTick)(value)}</text>
							`,
							)}
							<line
								class="axis-line"
								x1=${bounds.left}
								x2=${bounds.left}
								y1=${bounds.top}
								y2=${height - bounds.bottom}
							></line>
							<line
								class="axis-line"
								x1=${bounds.left}
								x2=${width - bounds.right}
								y1=${height - bounds.bottom}
								y2=${height - bounds.bottom}
							></line>
							${xTicks.map(
								(value) => svg`
								<line
									class="axis-line"
									x1=${x(value)}
									x2=${x(value)}
									y1=${height - bounds.bottom}
									y2=${height - bounds.bottom + 5}
								></line>
								<text
									class="tick-label"
									x=${x(value)}
									y=${height - bounds.bottom + 17}
									text-anchor="middle"
								>${(this.options.xTickFormat ?? formatTick)(value)}</text>
							`,
							)}
							<g clip-path="url(#plot-clip)">
								${series.map((entry, index) =>
									entry.areaFill
										? svg`
										<path
											class="series-area"
											d=${this.areaPath(entry.points, x, y, height - bounds.bottom, this.options.smoothLines)}
											fill="url(#area-${index})"
										></path>
									`
										: nothing,
								)}
								${series.map(
									(entry) => svg`
									<path
										class="series"
										d=${this.linePath(entry.points, x, y, this.options.smoothLines)}
										stroke=${entry.color}
										stroke-dasharray=${textureDasharray(entry.texture) ?? nothing}
									></path>
								`,
								)}
							</g>
							<text
								class="axis-title"
								x=${(bounds.left + width - bounds.right) / 2}
								y=${height - 3}
								text-anchor="middle"
							>
								${xAxisTitle}
							</text>
							<text
								class="axis-title"
								x="13"
								y=${height / 2}
								text-anchor="middle"
								transform=${`rotate(-90 13 ${height / 2})`}
							>
								${yAxisTitle}
							</text>
						</svg>
						<ul
							role="list"
							class="legend ${this.options.legendPosition === "top-left" ? "left" : ""}"
							aria-label="Chart series"
							?hidden=${legendSeries.length === 0}
						>
							${legendSeries.map(
								(entry) =>
									html`<li class="legend-item">
										<svg
											class="legend-swatch"
											style=${`--line-color: ${entry.color}`}
											viewBox="0 0 27 2"
											aria-hidden="true"
										>
											<line
												x1="1"
												y1="1"
												x2="26"
												y2="1"
												stroke-dasharray=${textureDasharray(entry.texture) ?? nothing}
											></line>
										</svg>
										<span>${entry.legendLabel ?? entry.name}</span>
									</li>`,
							)}
						</ul>
					</div>
				</figure>
				<div
					slot="footer"
					?hidden=${!this.hasFooter}
				>
					<slot
						name="footer"
						@slotchange=${this.slotChanged}
					></slot>
				</div>
			</s-card>
		`;
	}

	private linePath(
		points: LineChartPoint[],
		x: (value: number) => number,
		y: (value: number) => number,
		smooth = false,
	): string {
		if (!smooth || points.length < 3) {
			return points
				.map(
					(point, index) =>
						`${index === 0 ? "M" : "L"}${x(point.x)} ${y(point.y)}`,
				)
				.join(" ");
		}

		const coordinates = points.map((point) => ({
			x: x(point.x),
			y: y(point.y),
		}));
		const slopes = coordinates.slice(1).map((point, index) => {
			const previous = coordinates[index]!;
			return (point.y - previous.y) / (point.x - previous.x);
		});
		if (slopes.some((slope) => !Number.isFinite(slope))) {
			return this.linePath(points, x, y);
		}
		// Harmonic-mean tangents keep the curve inside each pair of bin heights.
		const tangents = coordinates.map((_, index) => {
			if (index === 0) {
				return slopes[0]!;
			}
			if (index === coordinates.length - 1) {
				return slopes.at(-1)!;
			}
			const before = slopes[index - 1]!;
			const after = slopes[index]!;
			if (before * after <= 0) {
				return 0;
			}
			const left = coordinates[index]!.x - coordinates[index - 1]!.x;
			const right = coordinates[index + 1]!.x - coordinates[index]!.x;
			const weightBefore = 2 * right + left;
			const weightAfter = right + 2 * left;
			return (
				(weightBefore + weightAfter) /
				(weightBefore / before + weightAfter / after)
			);
		});
		let path = `M${coordinates[0]!.x} ${coordinates[0]!.y}`;
		for (let index = 1; index < coordinates.length; index++) {
			const previous = coordinates[index - 1]!;
			const point = coordinates[index]!;
			const third = (point.x - previous.x) / 3;
			path += ` C${previous.x + third} ${previous.y + tangents[index - 1]! * third} ${point.x - third} ${point.y - tangents[index]! * third} ${point.x} ${point.y}`;
		}
		return path;
	}

	private areaPath(
		points: LineChartPoint[],
		x: (value: number) => number,
		y: (value: number) => number,
		baseline: number,
		smooth = false,
	): string {
		if (points.length === 0) {
			return "";
		}
		const line = this.linePath(points, x, y, smooth);
		const first = points[0]!;
		const last = points.at(-1)!;
		return `${line} L${x(last.x)} ${baseline} L${x(first.x)} ${baseline} Z`;
	}
}
