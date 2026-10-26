import { customElement } from "lit/decorators.js";
import {
	ScrubbableGraph,
	graphSeries,
	type ScrubbableGraphDefinition,
} from "../../../shared/components/ScrubbableGraph";
import { number, thousands } from "../../../shared/Formatters";

import { optimalHashes } from "../model/Math";

function optimalHashesLines() {
	return [100, 1000, 5000].map((items, color) => ({
		label: `items=${items}`,
		y: (x: number) => optimalHashes(x, items),
		color,
	}));
}

@customElement("s-bloom-optimal-hashes-graph")
export class OptimalHashesGraph extends ScrubbableGraph {
	protected override get definition(): ScrubbableGraphDefinition {
		return {
			title: "Optimal number of hash functions",
			x: { maximum: 10000, label: "Bits in bloom filter", format: thousands },
			y: { maximum: 10, label: "Optimal hash functions", format: number },
			series: graphSeries(optimalHashesLines(), "--bloom-line"),
			formatThumb: (value) => `${thousands(value)} bits in filter`,
		};
	}
}
