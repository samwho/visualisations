export const GRAPH_HEIGHT = 420;
// Four 62px plot rows, with the existing space for annotations and the slider.
export const SCRUBBABLE_GRAPH_HEIGHT = 358;
export const THUMB_RADIUS = 15;
export const GRAPH_PADDING = 24;

/** SVG and the native slider use these same CSS-pixel coordinates. */
export class GraphGeometry {
	readonly left = GRAPH_PADDING;

	readonly top = GRAPH_PADDING;

	// The thumb centre has the same inset on all three edges, so its outer
	// circle has equal clearance at either bottom corner.
	readonly thumbY = SCRUBBABLE_GRAPH_HEIGHT - GRAPH_PADDING;

	readonly bottom = this.thumbY - 62;

	readonly span: number;

	constructor(
		readonly width: number,
		readonly xMaximum: number,
		readonly yMaximum: number,
	) {
		this.span = Math.max(1, width - this.left * 2);
	}

	x(value: number): number {
		return this.left + (value / this.xMaximum) * this.span;
	}

	y(value: number): number {
		return this.bottom - (value / this.yMaximum) * (this.bottom - this.top);
	}
}

/** Keep every series identifiable, even at coincident or off-scale endpoints. */
export function placeEndpointLabels(
	values: readonly number[],
	plot: GraphGeometry,
): number[] {
	const labels = values.map((value, index) => ({
		index,
		// Reserve room for the heading above the labels, even at the plot ceiling.
		y: Math.max(plot.top + 20, plot.y(value) - 8),
	}));
	labels.sort((a, b) => a.y - b.y);
	for (let index = 1; index < labels.length; index++) {
		labels[index]!.y = Math.max(labels[index]!.y, labels[index - 1]!.y + 18);
	}
	const overflow = Math.max(0, (labels.at(-1)?.y ?? 0) - (plot.bottom + 10));
	const positions: number[] = [];
	for (const label of labels) {
		positions[label.index] = label.y - overflow;
	}
	return positions;
}
