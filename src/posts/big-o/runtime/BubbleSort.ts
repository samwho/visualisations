export interface BubbleSortStep {
	array: number[];
	kind: "start" | "swap" | "pass-end";
	/** Step coordinate; the final no-swap pass also advances one step. */
	position: number;
}

export function bubbleSortTrace(array: readonly number[]): BubbleSortStep[] {
	const working = [...array];
	const trace: BubbleSortStep[] = [
		{ array: [...working], kind: "start", position: 0 },
	];
	if (working.length === 0) {
		return trace;
	}
	for (;;) {
		const start = trace.length;
		for (let j = 0; j < working.length - 1; j++) {
			if (working[j]! > working[j + 1]!) {
				[working[j], working[j + 1]] = [working[j + 1]!, working[j]!];
				trace.push({
					array: [...working],
					kind: "swap",
					position: trace.length,
				});
			}
		}
		if (trace.length === start) {
			trace.push({
				array: [...working],
				kind: "pass-end",
				position: trace.length,
			});
			return trace;
		}
	}
}
