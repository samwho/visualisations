import { html, nothing, svg } from "lit";
import type { Snapshot } from "../model/MemoryFrame";

export function renderMemoryAnnotations(snapshot: Snapshot, columns: number) {
	const ranges = snapshot.ranges ?? [];
	const pointers = snapshot.pointers ?? [];
	if (ranges.length === 0 && pointers.length === 0) {
		return nothing;
	}
	columns = Math.max(1, columns);
	const rows = Math.ceil(snapshot.bytes.length / columns);
	return html`<svg
		class="annotations"
		viewBox=${`0 0 ${columns} ${rows}`}
		preserveAspectRatio="none"
		aria-hidden="true"
	>
		${ranges.flatMap((range) => {
			const start = Math.max(0, range.address);
			const end = Math.min(
				snapshot.bytes.length - 1,
				range.address + range.size - 1,
			);
			if (end < start) {
				return [];
			}
			const segments = [];
			let address = start;
			while (address <= end) {
				const segmentEnd = Math.min(
					end,
					(Math.floor(address / columns) + 1) * columns - 1,
				);
				const from = annotationPoint(address, columns);
				const to = annotationPoint(segmentEnd, columns);
				segments.push(svg`
					<line
						x1=${from.x}
						y1=${from.y}
						x2=${to.x}
						y2=${to.y}
						stroke=${range.color}
						stroke-width="0.16"
						stroke-linecap="round"
					/>
				`);
				address = segmentEnd + 1;
			}
			for (const endpoint of [start, end]) {
				const point = annotationPoint(endpoint, columns);
				segments.push(svg`
					<rect
						x=${point.x - 0.22}
						y=${point.y - 0.22}
						width="0.44"
						height="0.44"
						rx="0.1"
						fill=${range.color}
					/>
				`);
			}
			return segments;
		})}
		${pointers.map((pointer) => {
			const from = annotationPoint(pointer.address, columns);
			const to = annotationPoint(pointer.target, columns);
			return svg`
				<line
					x1=${from.x}
					y1=${from.y}
					x2=${to.x}
					y2=${to.y}
					stroke=${pointer.color}
					stroke-width="0.14"
					stroke-linecap="round"
				/>
				<polygon
					points=${arrowPoints(from, to)}
					fill=${pointer.color}
				/>
			`;
		})}
	</svg>`;
}

export function annotationPoint(address: number, columns: number) {
	return {
		x: (address % columns) + 0.5,
		y: Math.floor(address / columns) + 0.5,
	};
}

export function arrowPoints(
	from: { x: number; y: number },
	to: { x: number; y: number },
): string {
	const angle = Math.atan2(to.y - from.y, to.x - from.x);
	const size = 0.32;
	const left = {
		x: to.x - size * Math.cos(angle - Math.PI / 6),
		y: to.y - size * Math.sin(angle - Math.PI / 6),
	};
	const right = {
		x: to.x - size * Math.cos(angle + Math.PI / 6),
		y: to.y - size * Math.sin(angle + Math.PI / 6),
	};
	return `${to.x},${to.y} ${left.x},${left.y} ${right.x},${right.y}`;
}
