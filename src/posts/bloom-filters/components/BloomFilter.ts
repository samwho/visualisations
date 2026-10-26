import { customElement, property } from "lit/decorators.js";
import { BloomFilter as Filter } from "../../../shared/datastructures/BloomFilter";
import { indices } from "../Hashers";
import { BloomFilterBase } from "./BloomFilterBase";
import type { RingSegment } from "./SegmentedRing";

const hashRingColours = [
	"var(--bloom-sha1-ring)",
	"var(--bloom-sha256-ring)",
	"var(--bloom-sha512-ring)",
] as const;

@customElement("s-bloom-filter")
export class BloomFilter extends BloomFilterBase {
	@property({ type: Boolean, attribute: "preview-hashes" })
	previewHashes = false;

	@property({ attribute: false }) valueToHash = "foo";

	protected override readonly gridLabel = "Bloom filter bits";

	protected override previewRingSegments(): ReadonlyMap<
		number,
		readonly RingSegment[]
	> {
		if (!this.previewHashes) {
			return super.previewRingSegments();
		}
		const positions = indices(this.valueToHash, this.bits);
		const rings = new Map<number, readonly RingSegment[]>();
		for (let bit = 0; bit < this.bits; bit++) {
			rings.set(
				bit,
				hashRingColours.map((colour, hash) => ({
					colour,
					active: positions[hash] === bit,
				})),
			);
		}
		return rings;
	}

	protected override createFilter(): Filter {
		return new Filter(this.bits);
	}

	protected override bitLabel(index: number, count: number): string {
		return `Bit ${index}: ${count > 0 ? "set" : "unset"}`;
	}

	/** Deliberately incorrect removal for the post's false-negative demonstration. */
	unsafeRemoveValue(value: string): boolean {
		return this.removeItem(value);
	}
}
