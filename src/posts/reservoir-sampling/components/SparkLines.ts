import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { ThemeController } from "../../../shared/core/controllers/ThemeController";
import { TargetController } from "../../../shared/core/controllers/TargetController";
import type {
	SlidingGraph,
	SlidingGraphLine,
} from "../../../shared/components/SlidingGraph";
import { Rate } from "../core/Rate";
import { LogStream } from "./LogStream";
import "../../../shared/components/SlidingGraph";

interface Counts {
	total: number;
	selected: number;
}

@customElement("s-spark-lines")
export class SparkLines extends LitElement {
	@property({ attribute: "target-id" }) targetId = "";

	@property({ type: Number, attribute: "max-height" }) maxHeight = 100;

	@property({ type: Boolean, attribute: "hide-selected" }) hideSelected = false;

	@property({ type: Boolean, attribute: "hide-total" }) hideTotal = false;

	@property({ type: Number, attribute: "red-line" }) redLine?: number;

	@property({ type: Boolean, reflect: true }) paused = true;

	@query("s-sliding-graph") private graph?: SlidingGraph;

	private readonly nowMs = () => this.target.element?.timeline.nowMs() ?? 0;

	private readonly selectedRate = new Rate(this.nowMs);

	private readonly totalRate = new Rate(this.nowMs);

	private displayedRate = "0.0";

	private readonly graphLines: readonly SlidingGraphLine[] = [
		{
			id: "total",
			label: "Total logs",
			read: () => this.totalRate.value,
			initial: 0,
			color: "var(--color-log-chart-total)",
			onSample: (value) => {
				this.updateRate(value);
				this.updateGraphLabel();
			},
		},
		{
			id: "selected",
			label: "Sent logs",
			read: () => this.selectedRate.value,
			initial: 0,
			color: "var(--color-log-chart-selected)",
		},
	];

	private readonly target = new TargetController(this, {
		id: () => this.targetId,
		isTarget: (element): element is LogStream => element instanceof LogStream,
	});

	constructor() {
		super();
		new ThemeController(this);
		this.target.addEventListener("connected", (event) => {
			// SAFETY: TargetController emits connected with the prepared LogStream.
			const target = (event as CustomEvent<LogStream>).detail;
			target.addEventListener("logs", this.logs);
		});
		this.target.addEventListener("disconnected", (event) => {
			// SAFETY: TargetController emits disconnected with the prepared LogStream.
			const target = (event as CustomEvent<LogStream>).detail;
			target.removeEventListener("logs", this.logs);
		});
	}

	static override styles = css`
		:host {
			--color-log-chart-total: var(--gray-400);
			--color-log-chart-selected: var(--gray-900);
			display: block;
			width: 100%;
			height: 7.5rem;
		}
		:host([data-theme="dark"]) {
			--color-log-chart-total: var(--gray-500);
			--color-log-chart-selected: var(--stone-300);
		}
		s-sliding-graph {
			height: 100%;
		}
	`;

	private readonly logs = (event: Event): void => {
		if (this.paused) {
			return;
		}
		// SAFETY: the connected LogStream publishes arrival and sent-log counts.
		const counts = (event as CustomEvent<Counts>).detail;
		this.selectedRate.record(counts.selected);
		this.totalRate.record(counts.total);
	};

	private graphLabel(): string {
		const sent = this.selectedRate.value;
		const total = this.totalRate.value;
		return `Log rate: ${sent} sent, ${total} total logs per second${this.redLine === undefined ? "" : `, threshold ${this.redLine}`}`;
	}

	private updateGraphLabel(): void {
		if (this.graph) {
			this.graph.label = this.graphLabel();
		}
	}

	private updateRate(value: number): void {
		const rate = Math.max(0, value).toFixed(1);
		if (rate !== this.displayedRate) {
			this.displayedRate = rate;
			this.dispatchEvent(new CustomEvent<string>("rate", { detail: rate }));
		}
	}

	reset(): void {
		this.selectedRate.reset();
		this.totalRate.reset();
		this.graph?.reset();
		this.updateRate(0);
		this.updateGraphLabel();
	}

	protected override render() {
		return html`
			<s-sliding-graph
				.timeline=${this.target.element?.timeline}
				.lines=${this.graphLines.map((line) => ({
					...line,
					visible: line.id === "total" ? !this.hideTotal : !this.hideSelected,
				}))}
				.staticLines=${
					this.redLine === undefined
						? []
						: [
								{
									value: this.redLine,
									color: "var(--color-palette-orange-line)",
								},
							]
				}
				.yMax=${this.maxHeight}
				label=${this.graphLabel()}
			></s-sliding-graph>
		`;
	}
}
