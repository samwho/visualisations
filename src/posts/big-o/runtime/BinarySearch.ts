export function narrowRange(min: number, max: number, higher: boolean) {
	const guess = Math.floor((min + max) / 2);
	return higher ? { min: guess + 1, max } : { min, max: guess - 1 };
}

export function binarySearchGuesses(target: number, min = 1, max = 100) {
	const rows: { guess: number; possibilities: number; response: string }[] = [];
	while (min <= max) {
		const guess = Math.floor((min + max) / 2);
		rows.push({
			guess,
			possibilities: max - min + 1,
			response:
				guess === target ? "Correct" : guess > target ? "Lower" : "Higher",
		});
		if (guess === target) {
			break;
		}
		({ min, max } = narrowRange(min, max, guess < target));
	}
	return rows;
}
