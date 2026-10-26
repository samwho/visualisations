export function reservoirIndex(
	seen: number,
	random: () => number = Math.random,
): number {
	return Math.floor(random() * seen);
}

// Algorithm R: https://en.wikipedia.org/wiki/Reservoir_sampling#Simple:_Algorithm_R
export class SimpleReservoir<T> {
	items: T[] = [];

	private seen = 0;

	constructor(
		private readonly k: number,
		private readonly random: () => number = Math.random,
	) {}

	reset(): void {
		this.seen = 0;
		this.items = [];
	}

	sample(item: T): boolean {
		this.seen += 1;
		if (this.items.length < this.k) {
			this.items.push(item);
			return true;
		}
		const index = reservoirIndex(this.seen, this.random);
		if (index < this.k) {
			this.items[index] = item;
			return true;
		}
		return false;
	}
}
