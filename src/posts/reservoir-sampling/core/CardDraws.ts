/** Draw from the end of a deck; the two-card illustration stops after nine draws. */
export class CardDraws {
	count = 0;

	constructor(
		private readonly deckSize: number,
		private readonly limit = deckSize,
	) {}

	get exhausted(): boolean {
		return this.count >= this.limit;
	}

	next(): number | undefined {
		if (this.exhausted) {
			return undefined;
		}
		return this.deckSize - 1 - this.count++;
	}

	reset(): void {
		this.count = 0;
	}
}
