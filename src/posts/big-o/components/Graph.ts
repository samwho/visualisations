import { css, html, LitElement, svg } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { ResizeController } from "../../../shared/core/controllers/ResizeController";
import {
	GRAPH_HEIGHT,
	GRAPH_PADDING,
	THUMB_RADIUS,
} from "../../../shared/core/ScrubbableGraphLayout";
import "../../../shared/components/Card";
import { Slider } from "../../../shared/components/Slider";
import {
	graphMarkerPaths,
	type GraphMarker,
} from "../../../shared/GraphMarkers";

interface Axis {
	max: number;
	step: number;
	label: string;
}
interface Line {
	label: string;
	y: (x: number) => number;
	linear: boolean;
	stepped: boolean;
	color: string;
	index: number;
}
const formulas = new Map<string, (x: number) => number>([
	["5 + x", (x) => 5 + x],
	["20", () => 20],
	["1", () => 1],
	["x", (x) => x],
	["Math.pow(x, 2)", (x) => x * x],
	["Math.log(x) / Math.log(2)", (x) => Math.log2(x)],
	["Math.ceil(Math.log(x) / Math.log(2))", (x) => Math.ceil(Math.log2(x))],
]);
const colors = ["green", "dark-blue", "red", "pink"];
let nextLine = 0;
const OUTER_PADDING = 12;
const LEGEND_GAP = 8;
const markers = [
	"circle",
	"diamond",
	"hexagon",
	"square",
] as const satisfies readonly GraphMarker[];

function axis(element: Element | null): Axis {
	return {
		max: Number(element?.getAttribute("max") ?? 100),
		step: Number(element?.getAttribute("tics") ?? 10),
		label: element?.getAttribute("label") ?? "",
	};
}

@customElement("s-graph")
export class Graph extends LitElement {
	@property({ type: Number, reflect: true }) drawupto = 0;

	@property() label = "Growth graph";

	@property({ type: Number, attribute: "aspect-ratio" }) aspectRatio = 0;

	@state() private width = 800;

	private x: Axis = { max: 100, step: 10, label: "" };

	private y: Axis = { max: 100, step: 10, label: "" };

	private lines: Line[] = [];

	private legend: string | null = null;

	constructor() {
		super();
		const resize = new ResizeController(this);
		resize.addEventListener("resize", (event) => {
			// SAFETY: ResizeController supplies the measured content box.
			const { width } = (event as CustomEvent<ResizeObserverEntry>).detail
				.contentRect;
			this.width = Math.max(1, width - 2 - OUTER_PADDING * 2);
		});
	}

	static override styles = css`
		:host {
			display: block;
			width: 100%;
			container-type: inline-size;
		}
		.plot {
			position: relative;
		}
		svg {
			display: block;
			width: 100%;
			height: auto;
		}
		.legend {
			position: absolute;
			inset-block-start: ${OUTER_PADDING + GRAPH_PADDING + LEGEND_GAP}px;
			inset-inline-end: ${OUTER_PADDING + GRAPH_PADDING + LEGEND_GAP}px;
			max-width: calc(
				100% - var(--_plot-left) -
					${OUTER_PADDING * 2 + GRAPH_PADDING + LEGEND_GAP * 2}px
			);
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			gap: var(--space-2);
			margin: 0;
			padding: var(--space-2);
			list-style: none;
			font: var(--type-chart-legend-size) var(--font-family-code);
			background: var(--color-surface-translucent);
			border: var(--border-width-thin) solid var(--color-border-subtle);
			border-radius: var(--radius-control);
		}
		.legend[data-position$="-left"] {
			inset-inline-start: calc(
				var(--_plot-left) + ${OUTER_PADDING + LEGEND_GAP}px
			);
			inset-inline-end: auto;
		}
		.legend[data-position^="bottom-"] {
			inset-block-start: auto;
			inset-block-end: calc(
				var(--_plot-bottom) + ${OUTER_PADDING + LEGEND_GAP}px
			);
		}
		.legend li {
			display: flex;
			align-items: center;
			gap: var(--space-1);
		}
		.key {
			width: 32px;
			height: 14px;
		}
		@container (max-width: 500px) {
			.legend {
				gap: 2px;
				padding: var(--space-1);
			}
			.key {
				width: 24px;
			}
		}
		::slotted(s-slider) {
			margin: 0;
			text-align: center;
			font: var(--font-size-small) var(--font-family-code);
		}
		text {
			fill: var(--color-text-primary);
			font-family: var(--font-family-code);
		}
		.grid {
			stroke: var(--color-border-chart);
			stroke-width: 1;
			opacity: 0.4;
		}
		.axis {
			stroke: var(--color-border-chart);
			opacity: 0.4;
		}
		.cursor {
			stroke: var(--color-border-chart);
			stroke-width: 1;
			opacity: 0.75;
		}
		slot:not([name="footer"]) {
			display: none;
		}
	`;

	protected override firstUpdated(): void {
		this.x = axis(this.querySelector("axes x"));
		this.y = axis(this.querySelector("axes y"));
		const legend = this.querySelector("legend");
		this.legend = legend
			? (legend.getAttribute("position") ?? "top-right")
			: null;
		this.lines = [...this.querySelectorAll("lines line")].map((el) => {
			const index = nextLine++;
			const expression = el.getAttribute("y") ?? "0";
			const y = formulas.get(expression)!;
			return {
				label: el.getAttribute("label") ?? expression,
				y,
				linear: ["5 + x", "20", "1", "x"].includes(expression),
				stepped: expression === "Math.ceil(Math.log(x) / Math.log(2))",
				color: `var(--color-data-fill-${colors[index % colors.length]})`,
				index,
			};
		});
		this.requestUpdate();
	}

	private marker(x: number, y: number, index: number) {
		const marker = markers[index % markers.length]!;
		return svg`<path
			d=${graphMarkerPaths[marker]}
			transform=${`translate(${x} ${y}) scale(5)`}
		></path>`;
	}

	protected override updated(): void {
		const slider = this.querySelector<Slider>('s-slider[slot="footer"]');
		if (slider) {
			const input = `${this.x.label || "Input size"}: ${this.drawupto.toFixed(0)}`;
			slider.visibleLabel = "";
			slider.valueText = `${input}. ${this.lines
				.map((line) => {
					const value = line.y(this.drawupto);
					return `${line.label}: ${Number.isFinite(value) ? value.toFixed(2) : "undefined"}`;
				})
				.join("; ")}`;
		}
	}

	protected override render() {
		const font = 11;
		const left = Math.max(
			GRAPH_PADDING,
			String(this.y.max).length * font * 0.6 +
				10 +
				(this.y.label ? font * 1.5 : 0),
		);
		const top = GRAPH_PADDING;
		const plotWidth = Math.max(1, this.width - left - GRAPH_PADDING);
		const bottom = GRAPH_PADDING + (this.x.label ? font * 2 : 0);
		// The ratio applies to the plotting area, excluding space for axes and labels.
		const plotHeight =
			this.aspectRatio > 0
				? plotWidth / this.aspectRatio
				: Math.max(1, GRAPH_HEIGHT - 40 - top - bottom);
		const height = top + plotHeight + bottom;
		const sx = (x: number) => left + (x / this.x.max) * plotWidth;

		const sy = (y: number) => top + plotHeight - (y / this.y.max) * plotHeight;

		const to = Math.max(0, Math.min(this.drawupto, this.x.max));
		const label = this.lines
			.map(
				(line) =>
					`${line.label}: ${Number.isFinite(line.y(to)) ? line.y(to).toFixed(2) : "undefined"} at input ${to.toFixed(0)}`,
			)
			.join("; ");
		const xTicks = Array.from(
			{ length: Math.floor(this.x.max / this.x.step) + 1 },
			(_, i) => i * this.x.step,
		);
		const yTicks = Array.from(
			{ length: Math.floor(this.y.max / this.y.step) + 1 },
			(_, i) => i * this.y.step,
		);
		return html`
			<s-card full-width>
				<div
					class="plot"
					style=${styleMap({
						"--_plot-left": `${left}px`,
						"--_plot-bottom": `${bottom}px`,
					})}
				>
					${
						this.legend === null
							? ""
							: html`<ul
									class="legend"
									data-position=${this.legend}
								>
									${this.lines.map(
										(line) =>
											html`<li>
												<svg
													class="key"
													viewBox="0 0 32 14"
													aria-hidden="true"
												>
													<g fill=${line.color}>
														<line
															x1="0"
															x2="25"
															y1="7"
															y2="7"
															stroke=${line.color}
															stroke-width="2"
														></line>
														${this.marker(24, 7, line.index)}
													</g>
												</svg>
												<span>${line.label}</span>
											</li>`,
									)}
								</ul>`
					}
					<svg
						viewBox=${`${-OUTER_PADDING} ${-OUTER_PADDING} ${this.width + OUTER_PADDING * 2} ${height + OUTER_PADDING * 2}`}
						role="img"
						aria-label=${`${this.label}. ${label}`}
						style=${`font-size: ${font}px`}
					>
						<line
							class="cursor"
							x1=${sx(to)}
							x2=${sx(to)}
							y1=${top}
							y2=${sy(0)}
							aria-hidden="true"
						></line>
						${yTicks.map(
							(tick) => svg`<line
								class="grid"
								x1=${left}
								x2=${sx(this.x.max)}
								y1=${sy(tick)}
								y2=${sy(tick)}
							></line
							>${
								tick > 0
									? svg`<text
											x=${left - 5}
											y=${sy(tick)}
											text-anchor="end"
											dominant-baseline="middle"
											>${tick}</text
										>`
									: ""
							}`,
						)}
						${xTicks.map(
							(tick) => svg`<line
								class="grid"
								x1=${sx(tick)}
								x2=${sx(tick)}
								y1=${top}
								y2=${sy(0)}
							></line
							>${
								tick > 0
									? svg`<text
											x=${sx(tick)}
											y=${sy(0) + font + 1}
											text-anchor="middle"
											>${tick}</text
										>`
									: ""
							}`,
						)}
						<path
							class="axis"
							fill="none"
							d=${`M ${left} ${top} V ${sy(0)} H ${sx(this.x.max)}`}
						></path>
						<defs>
							<clipPath id="plot-clip">
								<!-- Clip at the origin axes, but allow top/right overshoot. -->
								<rect
									x=${left}
									y=${-OUTER_PADDING}
									width=${Math.max(1, this.width + OUTER_PADDING - left)}
									height=${sy(0) + OUTER_PADDING}
								></rect>
							</clipPath>
							<clipPath id="reveal-clip">
								<rect
									x=${left}
									y=${-OUTER_PADDING}
									width=${sx(to) - left}
									height=${sy(0) + OUTER_PADDING}
								></rect>
							</clipPath>
						</defs>
						<g clip-path="url(#plot-clip)">
							${this.lines.map((line) => {
								// Keep curve geometry fixed while the slider reveals it.
								const count = line.linear ? 2 : Math.ceil(plotWidth) + 1;
								const points = line.stepped
									? [{ x: 1, y: 0 }]
									: Array.from({ length: count }, (_, i) => {
											const x = (i / (count - 1)) * this.x.max;
											return { x, y: line.y(x) };
										}).filter((point) => Number.isFinite(point.y));
								if (line.stepped) {
									for (let x = 1; x < this.x.max; x *= 2) {
										const y = line.y(x) + 1;
										points.push(
											{ x, y },
											{ x: Math.min(x * 2, this.x.max), y },
										);
									}
								}
								const d = points
									.map(
										(point, i) =>
											`${i === 0 ? "M" : "L"}${sx(point.x)} ${sy(point.y)}`,
									)
									.join(" ");
								const endpoint = line.y(to);
								return svg`<g fill=${line.color}
							><path
								d=${d}
								fill="none"
								stroke=${line.color}
								stroke-width="2"
								stroke-linecap="round"
								clip-path="url(#reveal-clip)"
							></path
								>${Number.isFinite(endpoint) && to > 0 ? this.marker(sx(to), sy(endpoint), line.index) : ""}</g
						>`;
							})}
						</g>
						${
							this.x.label
								? svg`<text
								x=${left + plotWidth / 2}
								y=${height - 5}
								text-anchor="middle"
								>${this.x.label}</text
							>`
								: ""
						}
						${
							this.y.label
								? svg`<text
								transform=${`translate(15 ${top + plotHeight / 2}) rotate(-90)`}
								text-anchor="middle"
								>${this.y.label}</text
							>`
								: ""
						}
					</svg>
				</div>
				<div
					slot="footer"
					style=${`padding-inline: ${OUTER_PADDING + left - THUMB_RADIUS}px ${OUTER_PADDING + GRAPH_PADDING - THUMB_RADIUS}px`}
				>
					<slot name="footer"></slot>
				</div>
			</s-card>
			<slot></slot>
		`;
	}
}
