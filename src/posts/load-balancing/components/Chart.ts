import { css, html, LitElement } from "lit";
import type {
	LineChartOptions,
	LineChartSeries,
} from "../../../shared/components/LineChart";
import "../../../shared/components/LineChart";
import { visuallyHiddenStyles } from "../../../shared/styles/Accessibility";
import { histogramSeries } from "../model/Histogram";

export interface ChartDefinition extends LineChartOptions {
	summary: string;
}

/** Adds a text summary to the shared chart renderer for the post's recorded data. */
export abstract class Chart extends LitElement {
	static override styles = [
		visuallyHiddenStyles,
		css`
			:host {
				display: block;
				width: 100%;
				color: var(--color-text-primary);
			}
			figure {
				margin: 0;
			}
		`,
	];

	protected abstract readonly definition: ChartDefinition;

	protected readonly histogram: boolean = false;

	protected override render() {
		const definition = this.definition;
		const series = this.histogram
			? histogramSeries(
					definition.series,
					definition.xMinimum!,
					definition.xMaximum!,
				)
			: definition.series;
		return html`
			<figure
				aria-labelledby="chart-title"
				aria-describedby="chart-summary"
			>
				<div
					class="chart-shell"
					aria-hidden="true"
					inert
				>
					<s-line-chart .options=${{ ...definition, series }}></s-line-chart>
				</div>
				<figcaption class="visually-hidden">
					<h3 id="chart-title">${definition.title}</h3>
					<p id="chart-summary">${definition.summary}</p>
					<p>${definition.yAxisTitle} by ${definition.xAxisTitle}.</p>
					<h4>Data summary</h4>
					<ul>
						${series.map((entry) => html`<li>${this.seriesDescription(entry)}</li>`)}
					</ul>
				</figcaption>
			</figure>
		`;
	}

	private seriesDescription({ name, points }: LineChartSeries): string {
		const peak = points.reduce((highest, point) =>
			point.y > highest.y ? point : highest,
		);
		if (this.histogram) {
			const total = points.reduce((sum, point) => sum + point.y, 0);
			return `${name}: ${formatValue(total)} requests; the busiest response-time bin is ${formatValue(peak.x)} milliseconds with ${formatValue(peak.y)} requests.`;
		}
		const first = points[0]!;
		const last = points.at(-1)!;
		const lowest = points.reduce((minimum, point) =>
			point.y < minimum.y ? point : minimum,
		);
		return `${name}: starts at ${formatValue(first.y)}, ends at ${formatValue(last.y)}, reaches a minimum of ${formatValue(lowest.y)} and a maximum of ${formatValue(peak.y)}.`;
	}
}

function formatValue(value: number): string {
	return Number.isInteger(value)
		? String(value)
		: value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
