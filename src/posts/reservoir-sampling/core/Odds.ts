export type SamplingMethod = "coin-flip" | "reservoir";

/** Zero-based card position among draws; unseen cards have zero probability. */
export function holdingProbability(
	method: SamplingMethod,
	drawn: number,
	index: number,
): number {
	if (index >= drawn) {
		return 0;
	}
	if (method === "reservoir") {
		return 1 / drawn;
	}
	// The first card is kept automatically; only later draws require a coin flip.
	return 0.5 ** (drawn - (index === 0 ? 1 : index));
}
