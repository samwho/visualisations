import { customElement } from "lit/decorators.js";
import { CountingBloomFilter as Filter } from "../../../shared/datastructures/CountingBloomFilter";
import { BloomFilterBase } from "./BloomFilterBase";

@customElement("s-counting-bloom-filter")
export class CountingBloomFilter extends BloomFilterBase {
	protected override readonly gridLabel = "Counting bloom filter";

	protected override createFilter(): Filter {
		return new Filter(this.bits);
	}

	protected override bitLabel(index: number, count: number): string {
		return `Bit ${index}: count ${count}`;
	}

	protected override renderCount(count: number): number {
		return count;
	}

	/** Only remove values that were added: false positives can still cause damage. */
	removeValue(value: string): boolean {
		return this.removeItem(value);
	}
}
