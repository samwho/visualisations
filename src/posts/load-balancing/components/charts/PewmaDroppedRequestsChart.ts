import { customElement } from "lit/decorators.js";
import { Chart, type ChartDefinition } from "../Chart";

import { droppedRequestSeries } from "../../data/DroppedRequests";

@customElement("s-pewma-dropped-requests-chart")
export class PewmaDroppedRequestsChart extends Chart {
	protected override readonly definition: ChartDefinition = {
		title: "Cumulative requests dropped over time",
		summary:
			"PEWMA initially drops fewer requests than least connections, but ends with 28 drops compared with 12 for least connections.",
		xMinimum: 0,
		xMaximum: 59,
		xTickStep: 4,
		yMinimum: 0,
		yMaximum: 80,
		yAxisTitle: "Dropped requests",
		xAxisTitle: "Time elapsed (seconds)",
		series: [
			...droppedRequestSeries,
			{
				name: "PEWMA",
				points: [
					{ x: 0, y: 0 },
					{ x: 14, y: 0 },
					{ x: 16, y: 2 },
					{ x: 20, y: 2 },
					{ x: 24, y: 5 },
					{ x: 27, y: 5 },
					{ x: 31, y: 8 },
					{ x: 37, y: 9 },
					{ x: 43, y: 16 },
					{ x: 48, y: 18 },
					{ x: 51, y: 23 },
					{ x: 53, y: 24 },
					{ x: 54, y: 26 },
					{ x: 59, y: 28 },
				],
				color: "var(--chart-red)",
				texture: "dash-dot",
				legendLabel: "PEWMA",
			},
		],
	};
}
