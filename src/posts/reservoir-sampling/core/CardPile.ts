/** Positions are sparse so removing a card never reindexes those left behind. */
export class Pile<T> {
	private readonly items = new Map<number, T>();

	get entries(): readonly (readonly [number, T])[] {
		return [...this.items].sort(([a], [b]) => a - b);
	}

	get cards(): readonly T[] {
		return this.entries.map(([, card]) => card);
	}

	get size(): number {
		return this.items.size;
	}

	get top(): T | undefined {
		return this.entries.at(-1)?.[1];
	}

	add(card: T, index = (this.entries.at(-1)?.[0] ?? -1) + 1): number {
		if (this.items.has(index) || this.cards.includes(card)) {
			throw new Error("Card or pile position already occupied");
		}
		this.items.set(index, card);
		return index;
	}

	take(card = this.top): T | undefined {
		for (const [index, item] of this.items) {
			if (item === card) {
				this.items.delete(index);
				return item;
			}
		}
		return undefined;
	}
}
