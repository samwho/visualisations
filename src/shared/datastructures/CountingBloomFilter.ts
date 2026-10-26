/**
 * Counting bloom filter storage, independent of hashing and presentation.
 * Operations take precomputed integer bit indices in [0, size).
 * Increments once per hash, including duplicate indices.
 */
export class CountingBloomFilter {
	readonly counts: number[];

	constructor(readonly size = 32) {
		this.counts = Array.from({ length: size }, () => 0);
	}

	add(bits: readonly number[]): void {
		for (const bit of bits) {
			this.counts[bit] = this.counts[bit]! + 1;
		}
	}

	contains(bits: readonly number[]): boolean {
		return bits.every((bit) => this.counts[bit]! > 0);
	}

	/** Only safe for items actually added, not merely positive membership checks. */
	remove(bits: readonly number[]): boolean {
		if (!this.contains(bits)) {
			return false;
		}
		for (const bit of bits) {
			this.counts[bit] = Math.max(0, this.counts[bit]! - 1);
		}
		return true;
	}

	reset(): void {
		this.counts.fill(0);
	}
}
