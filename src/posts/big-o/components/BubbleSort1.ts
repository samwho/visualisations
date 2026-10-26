import { MediaQueryController } from "../../../shared/core/controllers/MediaQueryController";
import { css, html, svg, LitElement, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { repeat } from "lit/directives/repeat.js";
import { FrameController } from "../../../shared/core/controllers/FrameController";
import { VisibilityController } from "../../../shared/core/controllers/VisibilityController";
import "./Icon";
import "../../../shared/components/Card";
import { shuffled } from "../../../shared/core/Random";
import { bubbleSortTrace, type BubbleSortStep } from "../runtime/BubbleSort";
import type {
	RadioGroup,
	RadioOption,
} from "../../../shared/components/RadioGroup";
import "../../../shared/components/RadioGroup";

const CASES: readonly (RadioOption & { icon: string })[] = [
	{ value: "best", label: "Best", icon: "star" },
	{ value: "worst", label: "Worst", icon: "thumbs-down" },
	{ value: "random", label: "Rand", icon: "shuffle" },
];

interface Point {
	x: number;
	y: number;
}

interface LayoutMetrics {
	circleRadius: number;
	rowHeight: number;
	fontSize: number;
	horizontalMargin: number;
	margin: number;
	columnWidth: number;
}

interface ValueRenderData {
	value: number;
	color: string;
	fill: string;
	positions: Point[];
	pathD: string;
	totalLength: number;
	cumulativeLengths: number[];
}

const GAP_BETWEEN_CIRCLES = 50 / 3;

const distanceBetween = (a: Point, b: Point): number =>
	Math.hypot(b.x - a.x, b.y - a.y);

const computeLayoutMetrics = (
	itemCount: number,
	columnCount: number,
	viewBoxWidth: number,
	viewBoxHeight: number,
): LayoutMetrics => {
	if (itemCount <= 0) {
		return {
			circleRadius: 0,
			rowHeight: 0,
			fontSize: 0,
			horizontalMargin: 0,
			margin: 0,
			columnWidth: 0,
		};
	}

	const verticalScale = viewBoxHeight / 400;
	const gap = GAP_BETWEEN_CIRCLES * verticalScale;
	const totalGaps = Math.max(0, (itemCount - 1) * gap);
	let circleRadius = (viewBoxHeight - totalGaps) / (2 * itemCount);
	circleRadius = Math.max(5, Math.min((100 / 3) * verticalScale, circleRadius));

	const rowHeight = circleRadius * 2 + gap;
	const fontSize = circleRadius * 0.75;
	const horizontalMargin = circleRadius + 10;

	const totalHeight = itemCount * circleRadius * 2 + totalGaps;
	const margin = Math.max(0, (viewBoxHeight - totalHeight) / 2);

	const availableWidth = viewBoxWidth - 2 * horizontalMargin;
	let columnWidth = 0;
	if (columnCount > 1) {
		columnWidth = availableWidth / (columnCount - 1);
	}

	return {
		circleRadius,
		rowHeight,
		fontSize,
		horizontalMargin,
		margin,
		columnWidth,
	};
};

const computeValueRenderData = (
	iterations: readonly BubbleSortStep[],
	layout: LayoutMetrics,
	colors: ReadonlyMap<number, string>,
): ValueRenderData[] => {
	const firstIteration = iterations[0]?.array ?? [];

	return firstIteration.map((value, index) => {
		const positions: Point[] = iterations.map((iteration) => {
			const arrayIndex = iteration.array.indexOf(value);
			const x =
				layout.horizontalMargin + iteration.position * layout.columnWidth;
			const y =
				layout.margin + arrayIndex * layout.rowHeight + layout.circleRadius;
			return { x, y };
		});

		if (positions.length === 0) {
			const x = layout.horizontalMargin;
			const y = layout.margin + index * layout.rowHeight + layout.circleRadius;
			positions.push({ x, y });
		}

		let pathD = "";
		if (positions.length > 0) {
			pathD = `M ${positions[0]!.x} ${positions[0]!.y}`;
			for (let i = 1; i < positions.length; i++) {
				const point = positions[i]!;
				pathD += ` L ${point.x} ${point.y}`;
			}
		}

		const cumulativeLengths: number[] = [];
		let totalLength = 0;
		for (let i = 0; i < positions.length; i++) {
			if (i === 0) {
				cumulativeLengths.push(0);
			} else {
				const previous = positions[i - 1]!;
				const current = positions[i]!;
				totalLength += distanceBetween(previous, current);
				cumulativeLengths.push(totalLength);
			}
		}

		const color = colors.get(value) ?? "orange";

		return {
			value,
			color: `var(--color-data-fill-${color})`,
			fill: `var(--color-array-${color})`,
			positions,
			pathD,
			totalLength,
			cumulativeLengths,
		};
	});
};

@customElement("s-bubble-sort-1")
export class BubbleSort1 extends LitElement {
	constructor() {
		super();
		this.narrowScreen.addEventListener("change", this.resizePlot);
		this.smallScreen.addEventListener("change", this.resizePlot);
		// SAFETY: FrameController update events carry timeline time and delta.
		this.frames.addEventListener("update", (event) =>
			this.transition?.((event as CustomEvent<{ nowMs: number }>).detail.nowMs),
		);
		this.visibility.addEventListener("hidden", () => this.finishAnimation());
	}

	static override styles = css`
		:host {
			--color-array-foreground: var(--color-palette-orange-on-solid);
			--color-array-orange: var(--color-palette-orange-solid);
			--color-array-green: var(--color-palette-green-solid);
			--color-array-dark-blue: var(--color-palette-dark-blue-solid);
			--color-array-red: var(--color-palette-red-solid);
			--color-array-pink: var(--color-palette-pink-solid);
			display: block;
			width: 100%;
		}
		.controls {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-2);
		}
		.case-option {
			display: inline-flex;
			align-items: center;
			gap: var(--space-1);
		}
		@media (max-width: 480px) {
			s-radio-group {
				--control-min-width: 2rem;
				--control-padding-inline: var(--space-2);
			}
			.case-label {
				display: none;
			}
		}
		.plot {
			padding: var(--space-4);
			contain: layout style paint;
		}
		svg {
			display: block;
			width: 100%;
			height: auto;
			aspect-ratio: 2 / 1;
		}
		@media (max-width: 640px) {
			svg {
				aspect-ratio: 8 / 5;
			}
		}
		@media (max-width: 400px) {
			svg {
				aspect-ratio: 4 / 3;
			}
		}
		text {
			text-anchor: middle;
			dominant-baseline: middle;
			font-family: var(--font-family-code);
			font-weight: var(--font-weight-bold);
			fill: var(--color-array-foreground);
		}
		.value-path {
			stroke-width: 5.333;
			fill: none;
			stroke-linejoin: round;
			stroke-linecap: round;
		}
		.right {
			margin-inline-start: auto;
			display: flex;
			align-items: center;
			gap: var(--space-2);
		}
		.guide-path {
			stroke: var(--color-progress-track);
		}
	`;

	@property({ type: Array, reflect: true })
	array: number[] = [];

	@state() private currentIteration = 0;

	@state() private selectedCase = "worst";

	@state() private displayedIteration = 0;

	@state() private caseProgress = 1;

	@state() private guideProgress = 1;

	@state() private retractProgress = 0;

	private retractingData: ValueRenderData[] = [];

	private casePositions = new Map<number, Point>();

	private readonly VIEWBOX_WIDTH = 800;

	private readonly narrowScreen = new MediaQueryController(
		this,
		"(max-width: 640px)",
	);

	private readonly smallScreen = new MediaQueryController(
		this,
		"(max-width: 400px)",
	);

	@state() private viewBoxHeight = 400;

	private readonly resizePlot = (): void => {
		this.finishAnimation();
		this.viewBoxHeight = this.smallScreen.matches
			? 600
			: this.narrowScreen.matches
				? 500
				: 400;
	};

	override connectedCallback(): void {
		super.connectedCallback();
		this.resizePlot();
	}

	private readonly COLORS = [
		"orange",
		"green",
		"dark-blue",
		"red",
		"pink",
	] as const;

	private readonly colors = new Map<number, string>();

	private iterations: BubbleSortStep[] = [];

	private layout = computeLayoutMetrics(
		0,
		0,
		this.VIEWBOX_WIDTH,
		this.viewBoxHeight,
	);

	private valueData: ValueRenderData[] = [];

	private readonly visibility = new VisibilityController(this);

	private readonly frames = new FrameController(this);

	private transition?: (now: number) => void;

	protected override willUpdate(changed: PropertyValues): void {
		if (
			!changed.has("array") &&
			!changed.has("currentIteration") &&
			!changed.has("viewBoxHeight")
		) {
			return;
		}
		if (changed.has("array")) {
			const positions = new Map(
				this.valueData.map((value) => [
					value.value,
					this.displayedPosition(value),
				]),
			);
			const oldGuides =
				this.guideProgress > 0 ? this.valueData : this.retractingData;
			const oldProgress =
				this.guideProgress > 0 ? this.guideProgress : this.retractProgress;
			this.currentIteration = 0;
			this.finishAnimation();
			if (positions.size > 0 && this.canAnimate()) {
				this.casePositions = positions;
				this.caseProgress = 0;
				this.guideProgress = 0;
				this.retractingData = oldGuides;
				this.retractProgress = oldProgress;
			}
			if (
				this.array.length !== this.colors.size ||
				this.array.some((value) => !this.colors.has(value))
			) {
				this.colors.clear();
				for (const [index, value] of this.array.entries()) {
					this.colors.set(value, this.COLORS[index % this.COLORS.length]!);
				}
			}
			this.iterations = bubbleSortTrace(this.array);
		}
		if (changed.has("array") || changed.has("viewBoxHeight")) {
			// Reserve every possible swap plus the final no-swap pass for all cases.
			const columnCount = (this.array.length * (this.array.length - 1)) / 2 + 2;
			this.layout = computeLayoutMetrics(
				this.array.length,
				columnCount,
				this.VIEWBOX_WIDTH,
				this.viewBoxHeight,
			);
			this.valueData = computeValueRenderData(
				this.iterations,
				this.layout,
				this.colors,
			);
		}
		this.role = "group";
		this.ariaLabel =
			"Bubble sort step " +
			this.currentIteration +
			" of " +
			(this.iterations.length - 1) +
			", array: " +
			(this.iterations[this.currentIteration]?.array ?? this.array).join(", ") +
			", " +
			(this.iterations[this.currentIteration]?.kind === "pass-end"
				? "final pass, no swaps"
				: (this.iterations[this.currentIteration]?.kind ?? "start"));
	}

	private finishAnimation(): void {
		this.frames.timeline.pause();
		this.transition = undefined;
		this.displayedIteration = this.currentIteration;
		this.casePositions.clear();
		this.caseProgress = 1;
		this.guideProgress = 1;
		this.retractingData = [];
		this.retractProgress = 0;
	}

	private canAnimate(): boolean {
		return (
			!this.visibility.isHidden &&
			!matchMedia("(prefers-reduced-motion: reduce)").matches
		);
	}

	private animateProgress(
		update: (progress: number) => void,
		complete?: () => void,
		duration = 1000,
	): void {
		this.frames.timeline.pause();
		this.frames.timeline.resume();
		const start = this.frames.timeline.nowMs();
		this.transition = (now: number): void => {
			const progress = Math.max(0, Math.min(1, (now - start) / duration));
			update(progress);
			if (progress === 1) {
				this.frames.timeline.pause();
				this.transition = undefined;
				complete?.();
			}
		};
	}

	private animateStep(): void {
		if (!this.canAnimate()) {
			this.finishAnimation();
			return;
		}
		const from = this.displayedIteration;
		const to = this.currentIteration;
		if (from === to) {
			this.finishAnimation();
			return;
		}
		this.animateProgress((progress) => {
			this.displayedIteration = from + (to - from) * (1 - (1 - progress) ** 3);
		});
	}

	protected override updated(changed: PropertyValues): void {
		if (changed.has("array") && this.casePositions.size > 0) {
			const retractFrom = this.retractProgress;
			const retractDuration = 200;
			const reorderDuration = 350;
			const drawDuration = 450;
			const duration = retractDuration + reorderDuration + drawDuration;
			const phase = (elapsed: number, start: number, length: number) =>
				Math.max(0, Math.min(1, (elapsed - start) / length));

			this.animateProgress(
				(progress) => {
					// Retract the previous route before moving circles and drawing its replacement.
					const elapsed = progress * duration;
					this.retractProgress =
						retractFrom * (1 - phase(elapsed, 0, retractDuration));
					this.caseProgress =
						1 - (1 - phase(elapsed, retractDuration, reorderDuration)) ** 3;
					// A stronger ease-out makes the quick redraw visibly slow at its end.
					this.guideProgress =
						1 -
						(1 -
							phase(
								elapsed,
								retractDuration + reorderDuration,
								drawDuration,
							)) **
							4;
				},
				() => {
					this.casePositions.clear();
					this.retractingData = [];
					// Steps clicked during a reshuffle follow the new lines afterwards.
					this.animateStep();
				},
				duration,
			);
		} else if (
			changed.has("currentIteration") &&
			this.casePositions.size === 0
		) {
			this.animateStep();
		}
	}

	private displayedPosition(value: ValueRenderData): Point {
		const index = Math.min(this.displayedIteration, value.positions.length - 1);
		const from = value.positions[Math.floor(index)]!;
		const to = value.positions[Math.ceil(index)]!;
		const progress = index - Math.floor(index);
		const position = {
			x: from.x + (to.x - from.x) * progress,
			y: from.y + (to.y - from.y) * progress,
		};
		const caseFrom = this.casePositions.get(value.value);
		return caseFrom
			? {
					x: caseFrom.x + (position.x - caseFrom.x) * this.caseProgress,
					y: caseFrom.y + (position.y - caseFrom.y) * this.caseProgress,
				}
			: position;
	}

	private renderGuides(values: readonly ValueRenderData[], progress: number) {
		return values.map(
			(value) => svg`<path
			class="value-path guide-path"
			data-value=${value.value}
			visibility=${progress === 0 || value.totalLength === 0 ? "hidden" : "visible"}
			stroke-dasharray=${value.totalLength + 1}
			stroke-dashoffset=${value.totalLength * (1 - progress)}
			d=${value.pathD}
		></path>`,
		);
	}

	protected override render() {
		const index = Math.min(
			this.displayedIteration,
			Math.max(this.iterations.length - 1, 0),
		);
		const previous = Math.floor(index);
		const next = Math.ceil(index);
		const progress = index - previous;
		return html`<s-card full-width>
			<div class="plot">
				${svg`<svg
					role="presentation"
					viewBox=${"0 0 " + this.VIEWBOX_WIDTH + " " + this.viewBoxHeight}
				>
					<g class="retracting-guides">
						${this.renderGuides(this.retractingData, this.retractProgress)}
					</g>
					<g class="guides">
						${this.renderGuides(this.valueData, this.guideProgress)}
					</g>
					<g class="trails">
						${repeat(
							this.valueData,
							(value) => value.value,
							(value) => {
								// Trail length follows the same segment interpolation as the circles.
								const length =
									value.cumulativeLengths[previous]! +
									(value.cumulativeLengths[next]! -
										value.cumulativeLengths[previous]!) *
										progress;
								return svg`<path
								class="value-path trail-path"
								data-value=${value.value}
								style=${styleMap({ stroke: value.color })}
								visibility=${index === 0 || this.casePositions.size > 0 ? "hidden" : "visible"}
								stroke-dasharray=${value.totalLength + 1}
								stroke-dashoffset=${value.totalLength - length}
								d=${value.pathD}
							></path>`;
							},
						)}
					</g>
					<!-- Separate paint layers keep every circle above every path. -->
					<g class="circles">
						${repeat(
							this.valueData,
							(value) => value.value,
							(value) => {
								const position = this.displayedPosition(value);
								return svg`<g
								class="value-group"
								data-value=${value.value}
								style=${styleMap({ transform: "translate(" + position.x + "px, " + position.y + "px)" })}
							>
								<circle class="sort-circle" style=${styleMap({ fill: value.fill })} r=${this.layout.circleRadius}></circle>
								<text class="value-label" y=${this.layout.fontSize * 0.1} font-size=${this.layout.fontSize}>${value.value}</text>
							</g>`;
							},
						)}
					</g>
				</svg>`}
			</div>
			<div
				class="controls"
				slot="footer"
			>
				<s-button
					label="Reset"
					@click=${this.reset}
					><s-icon
						slot="icon"
						name="restart"
					></s-icon
				></s-button>
				<s-radio-group
					appearance="button"
					label="Sorting case"
					.options=${CASES}
					.value=${this.selectedCase}
					@change=${this.changeCase}
					@reselect=${this.changeCase}
				>
					${CASES.map(
						(option) =>
							html`<span
								slot=${option.value}
								class="case-option"
								><s-icon
									name=${option.icon}
									aria-hidden="true"
								></s-icon
								><span class="case-label">${option.label}</span></span
							>`,
					)}
				</s-radio-group>
				<div class="right">
					<s-button
						label="Step back"
						@click=${() => (this.currentIteration -= 1)}
						?disabled=${this.currentIteration <= 0}
						><s-icon
							slot="icon"
							name="back"
						></s-icon
					></s-button>
					<s-button
						label="Step forward"
						@click=${() => (this.currentIteration += 1)}
						?disabled=${this.currentIteration >= this.iterations.length - 1}
						><s-icon
							slot="icon"
							name="forward"
						></s-icon
					></s-button>
				</div>
			</div>
		</s-card>`;
	}

	private readonly reset = (): void => {
		this.currentIteration = 0;
	};

	private readonly changeCase = (event: Event): void => {
		// SAFETY: this handler is attached to the shared radio group.
		this.selectedCase = (event.currentTarget as RadioGroup).value;
		this.array =
			this.selectedCase === "random"
				? shuffled(this.array)
				: [...this.array].sort(
						this.selectedCase === "best" ? (a, b) => a - b : (a, b) => b - a,
					);
		this.currentIteration = 0;
	};

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.frames.timeline.pause();
		this.transition = undefined;
	}
}
