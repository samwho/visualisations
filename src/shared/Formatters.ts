export const percent = (n: number) => `${(n * 100).toFixed(1)}%`;

export const number = (n: number) => String(Number(n.toFixed(1)));

export const thousands = (n: number) =>
	n === 0 ? "0" : `${Number((n / 1000).toFixed(1))}k`;
