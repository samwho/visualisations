import { customElement, property } from "lit/decorators.js";
import {
	ScrubbableGraph,
	graphSeries,
	type ScrubbableGraphDefinition,
} from "../../../shared/components/ScrubbableGraph";
import { number, thousands } from "../../../shared/Formatters";

import { occupied } from "../model/Math";

function bitsSetLines(bits: number) {
	return [5, 4, 3, 2, 1].map((hashCount) => ({
		label: `hashes=${hashCount}`,
		y: (x: number) => occupied(bits, hashCount, x),
		color: hashCount - 1,
	}));
}

@customElement("s-bloom-bits-set-graph")
export class BitsSetGraph extends ScrubbableGraph {
	@property({ type: Number }) bits = 1000;

	protected override get definition(): ScrubbableGraphDefinition {
		return {
			title: `${this.bits.toLocaleString("en-US")} bits`,
			x: { maximum: 1000, label: "Items added", format: number },
			y: {
				maximum: this.bits,
				label: "Bits set",
				format:
					this.bits > 1000 ? thousands : (value) => String(Math.round(value)),
			},
			series: graphSeries(bitsSetLines(this.bits), "--bloom-line"),
			formatThumb: (value) => `${number(value)} items added`,
		};
	}
}
