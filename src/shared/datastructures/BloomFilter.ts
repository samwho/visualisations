/**
 * Bloom filter storage, independent of hashing and presentation.
 * Operations take precomputed integer bit indices in [0, size).
 */
export class BloomFilter {
	readonly counts: number[];

	constructor(readonly size = 32) {
		this.counts = Array.from({ length: size }, () => 0);
	}

	add(bits: readonly number[]): void {
		for (const bit of bits) {
			this.counts[bit] = 1;
		}
	}

	contains(bits: readonly number[]): boolean {
		return bits.every((bit) => this.counts[bit]! > 0);
	}

	/**
	 * Deliberately unsafe removal for demonstrations: clearing a shared bit can
	 * erase other items' membership.
	 */
	remove(bits: readonly number[]): boolean {
		if (!this.contains(bits)) {
			return false;
		}
		for (const bit of bits) {
			this.counts[bit] = 0;
		}
		return true;
	}

	reset(): void {
		this.counts.fill(0);
	}
}
