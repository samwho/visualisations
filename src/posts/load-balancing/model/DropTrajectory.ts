import {
	DROP_GRAVITY,
	DROP_MAX_DURATION,
	DROP_SAMPLE_INTERVAL,
} from "../globals";

interface Point {
	x: number;
	y: number;
}

interface Bounds {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

export interface DropTrajectory {
	durationMs: number;
	samples: Array<Point & { elapsedMs: number }>;
}

export function calculateDropTrajectory(
	fallAngle: number,
	bounds: Bounds,
): DropTrajectory {
	const acceleration = {
		x: Math.sin(fallAngle) * DROP_GRAVITY,
		y: Math.cos(fallAngle) * DROP_GRAVITY,
	};
	const samples: DropTrajectory["samples"] = [{ elapsedMs: 0, x: 0, y: 0 }];

	for (
		let elapsedMs = DROP_SAMPLE_INTERVAL;
		elapsedMs <= DROP_MAX_DURATION;
		elapsedMs += DROP_SAMPLE_INTERVAL
	) {
		const seconds = elapsedMs / 1000;
		const position = {
			x: 0.5 * acceleration.x * seconds * seconds,
			y: 0.5 * acceleration.y * seconds * seconds,
		};
		samples.push({ elapsedMs, ...position });

		if (
			position.x < bounds.left ||
			position.x > bounds.right ||
			position.y < bounds.top ||
			position.y > bounds.bottom
		) {
			return { durationMs: elapsedMs, samples };
		}
	}

	return {
		durationMs: samples.at(-1)?.elapsedMs ?? 0,
		samples,
	};
}
