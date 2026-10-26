import type { LineChartSeries } from "../../../shared/components/LineChart";

/** Fill missing response-time bins so an area chart returns to zero between them. */
export function histogramSeries(
	series: LineChartSeries[],
	xMinimum: number,
	xMaximum: number,
): LineChartSeries[] {
	const differences = series
		.flatMap(({ points }) =>
			points.slice(1).map((point, index) => point.x - points[index]!.x),
		)
		.filter((difference) => difference > 0);
	const binWidth = differences.length > 0 ? Math.min(...differences) : 1;
	const lastBin = Math.max(0, Math.round((xMaximum - xMinimum) / binWidth));
	return series.map((entry) => {
		const valuesByBin = new Map(
			entry.points.map((point) => [
				Math.round((point.x - xMinimum) / binWidth),
				point.y,
			]),
		);
		return {
			...entry,
			areaFill: true,
			points: Array.from({ length: lastBin + 1 }, (_, index) => ({
				x: xMinimum + index * binWidth,
				y: valuesByBin.get(index) ?? 0,
			})),
		};
	});
}
