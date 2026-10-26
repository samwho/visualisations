/** A one-second sliding window, without a timeout for every log. */
export class Rate {
	private times: number[] = [];

	constructor(private readonly nowMs: () => number) {}

	record(count: number): void {
		this.prune();
		const now = this.nowMs();
		for (let i = 0; i < count; i++) {
			this.times.push(now);
		}
	}

	get value(): number {
		this.prune();
		return this.times.length;
	}

	private prune(): void {
		const cutoff = this.nowMs() - 1000;
		this.times = this.times.filter((time) => time > cutoff);
	}

	reset(): void {
		this.times = [];
	}
}
