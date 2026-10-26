type Vertex = readonly [number, number];

function polygonPath(vertices: readonly Vertex[]): string {
	const twiceArea = vertices.reduce((area, [x, y], index) => {
		const [nextX, nextY] = vertices[(index + 1) % vertices.length]!;
		return area + x * nextY - nextX * y;
	}, 0);
	const scale = Math.sqrt((2 * Math.PI) / Math.abs(twiceArea));
	return (
		vertices
			.map(
				([x, y], index) =>
					`${index === 0 ? "M" : "L"}${x * scale} ${y * scale}`,
			)
			.join(" ") + "Z"
	);
}

function regularPolygon(sides: number): string {
	return polygonPath(
		Array.from({ length: sides }, (_, index): Vertex => {
			const angle = -Math.PI / 2 + (2 * Math.PI * index) / sides;
			return [Math.cos(angle), Math.sin(angle)];
		}),
	);
}

// Equal filled areas (π) balance visual weight, rather than bounding boxes.
// A scale of r gives every marker the same area as a circle of radius r.
export const graphMarkerPaths = {
	circle: "M1 0A1 1 0 1 0-1 0A1 1 0 1 0 1 0Z",
	square: polygonPath([
		[-1, -1],
		[1, -1],
		[1, 1],
		[-1, 1],
	]),
	diamond: regularPolygon(4),
	hexagon: regularPolygon(6),
	triangle: regularPolygon(3),
	pentagon: regularPolygon(5),
	cross: polygonPath([
		[-0.35, -1],
		[0.35, -1],
		[0.35, -0.35],
		[1, -0.35],
		[1, 0.35],
		[0.35, 0.35],
		[0.35, 1],
		[-0.35, 1],
		[-0.35, 0.35],
		[-1, 0.35],
		[-1, -0.35],
		[-0.35, -0.35],
	]),
} as const;

export type GraphMarker = keyof typeof graphMarkerPaths;

// SAFETY: this locally defined object has exactly the keys in GraphMarker.
export const graphMarkers = Object.keys(graphMarkerPaths) as GraphMarker[];
