import { customElement, property } from "lit/decorators.js";
import {
	ScrubbableGraph,
	graphSeries,
	type ScrubbableGraphDefinition,
} from "../../../shared/components/ScrubbableGraph";
import { percent } from "../../../shared/Formatters";
import { falsePositiveRate } from "../model/Math";

function falsePositiveLines(hashes: number[] = [3]) {
	return hashes.map((hashCount) => ({
		label: `hashes=${hashCount}`,
		y: (x: number) => falsePositiveRate(x, hashCount),
		color: hashCount - 1,
	}));
}

@customElement("s-bloom-false-positive-graph")
export class FalsePositiveGraph extends ScrubbableGraph {
	@property() hashes = "3";

	protected override get definition(): ScrubbableGraphDefinition {
		return {
			title: "False-positive rate",
			x: { maximum: 1, label: "Bits set", format: percent },
			y: { maximum: 1, label: "False-positive chance", format: percent },
			series: graphSeries(
				falsePositiveLines(this.hashes.split(",").map(Number)),
				"--bloom-line",
			),
			formatThumb: (value) => `${percent(value)} bits set`,
		};
	}
}
