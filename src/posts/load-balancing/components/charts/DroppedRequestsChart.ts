import { customElement } from "lit/decorators.js";
import { Chart, type ChartDefinition } from "../Chart";

import { droppedRequestSeries } from "../../data/DroppedRequests";

@customElement("s-dropped-requests-chart")
export class DroppedRequestsChart extends Chart {
	protected override readonly definition: ChartDefinition = {
		title: "Cumulative requests dropped over time",
		summary:
			"Under overload, least connections drops 12 requests, weighted round robin drops 35, and round robin drops 80 by the end of the run.",
		xMinimum: 0,
		xMaximum: 59,
		xTickStep: 4,
		yMinimum: 0,
		yMaximum: 80,
		yAxisTitle: "Requests dropped",
		xAxisTitle: "Time elapsed (seconds)",
		series: droppedRequestSeries,
	};
}
