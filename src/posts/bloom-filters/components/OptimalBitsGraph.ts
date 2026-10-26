import { customElement } from "lit/decorators.js";
import {
	ScrubbableGraph,
	graphSeries,
	type ScrubbableGraphDefinition,
} from "../../../shared/components/ScrubbableGraph";
import { number, percent, thousands } from "../../../shared/Formatters";

import { optimalBits } from "../model/Math";

function optimalBitsLines() {
	return [0.01, 0.05, 0.1].map((fpr, color) => ({
		label: `fpr=${percent(fpr)}`,
		y: (x: number) => optimalBits(x, fpr),
		color,
	}));
}

@customElement("s-bloom-optimal-bits-graph")
export class OptimalBitsGraph extends ScrubbableGraph {
	protected override get definition(): ScrubbableGraphDefinition {
		return {
			title: "Optimal number of bits",
			x: { maximum: 1000, label: "Items you plan to add", format: number },
			y: { maximum: 10000, label: "Bits required", format: thousands },
			series: graphSeries(optimalBitsLines(), "--bloom-line"),
			formatThumb: (value) => `${number(value)} items planned`,
		};
	}
}
