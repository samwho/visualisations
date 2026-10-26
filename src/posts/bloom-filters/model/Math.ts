/** Inputs use positive bit/hash counts and non-negative item counts. */
export const occupied = (bits: number, hashes: number, items: number) =>
	bits * (1 - (1 - 1 / bits) ** (hashes * items));

export const falsePositiveRate = (fractionSet: number, hashes: number) =>
	fractionSet ** hashes;

export const optimalBits = (items: number, fpr: number) =>
	Math.ceil((-items * Math.log(fpr)) / Math.log(2) ** 2);

export const optimalHashes = (bits: number, items: number) =>
	Math.ceil((bits / items) * Math.log(2));
