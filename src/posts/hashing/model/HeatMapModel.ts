import {
	bucketIndex,
	getValuesFunction,
	type HashFunction,
	type Values,
	type ValueFunction,
} from "./Hashers";

export interface InputSource {
	valueFn: Values;
	randomSeed: number;
	firstIndex: number;
}

/** A small recipe, not 100,000 strings crossing the worker boundary. */
export function inputSource(valueFn: Values, firstIndex = 0): InputSource {
	return {
		valueFn,
		firstIndex,
		randomSeed: crypto.getRandomValues(new Uint32Array(1))[0]!,
	};
}

function mulberry32(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state + 0x6d2b79f5) | 0;
		let value = Math.imul(state ^ (state >>> 15), state | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

/** Seeded recipes reproduce inputs even when rendering order changes. */
export class InputSequence {
	private readonly values: string[] = [];

	private constructor(
		readonly source: InputSource,
		private readonly generate: ValueFunction,
	) {}

	static async create(source: InputSource): Promise<InputSequence> {
		const generate = await getValuesFunction(
			source.valueFn,
			mulberry32(source.randomSeed),
		);
		return new InputSequence(source, generate);
	}

	get(index: number): string {
		while (this.values.length <= index) {
			this.values.push(
				this.generate(this.values.length + this.source.firstIndex),
			);
		}
		return this.values[index]!;
	}
}

export class HeatMapModel {
	readonly counts: Uint32Array;

	private current = 0;

	private placements: Uint16Array | Uint32Array = new Uint16Array(0);

	private cached = 0;

	private scaleTotal = -1;

	private scaleMaximum = 1;

	get maximum(): number {
		return this.scaleMaximum;
	}

	constructor(
		private readonly inputs: InputSequence,
		private readonly hash: HashFunction,
		private readonly seed: number,
		buckets: number,
	) {
		this.counts = new Uint32Array(buckets);
	}

	// Calibrate against the complete experiment once, then reuse its placements
	// while scrubbing. The scale must not change with the playback position.
	prepare(total: number, budget = 4): boolean {
		if (this.scaleTotal === total) {
			return true;
		}
		if (!this.advance(total, budget)) {
			return false;
		}
		this.scaleMaximum = 1;
		for (const count of this.counts) {
			this.scaleMaximum = Math.max(this.scaleMaximum, count);
		}
		this.scaleTotal = total;
		return true;
	}

	advance(target: number, budget = 4): boolean {
		if (target > this.placements.length) {
			const PlacementArray =
				this.counts.length <= 65536 ? Uint16Array : Uint32Array;
			const placements = new PlacementArray(
				Math.max(target, this.placements.length * 2, 1024),
			);
			placements.set(this.placements);
			this.placements = placements;
		}
		const started = performance.now();
		while (this.current !== target) {
			if (this.current > target) {
				const bucket = this.placements[--this.current]!;
				this.counts[bucket] = this.counts[bucket]! - 1;
			} else {
				if (this.current === this.cached) {
					this.placements[this.cached++] = bucketIndex(
						this.hash(this.inputs.get(this.current), this.seed),
						this.counts.length,
					);
				}
				const bucket = this.placements[this.current++]!;
				this.counts[bucket] = this.counts[bucket]! + 1;
			}
			if (this.current % 64 === 0 && performance.now() - started >= budget) {
				break;
			}
		}
		return this.current === target;
	}
}
