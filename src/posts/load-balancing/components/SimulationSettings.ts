import type {
	AlgorithmName,
	NumberRange,
	ServerPower,
} from "../model/Simulation";

export enum ServerLabelMode {
	None = "none",
	Latency = "latency",
	Requests = "requests",
	Pewma = "pewma",
	Auto = "auto",
}

export const algorithmLabels: Record<AlgorithmName, string> = {
	"round-robin": "Round Robin",
	"weighted-random": "Weighted Random",
	"weighted-round-robin": "Weighted Round Robin",
	"dynamic-weighted-round-robin": "Dynamic Weighted Round Robin",
	"least-connections": "Least Connections",
	"peak-exponentially-weighted-moving-average": "Peak EWMA",
	random: "Random",
};

export function parseRange(value: string, fallback: NumberRange): NumberRange {
	const values = value
		.split(/[:,]/)
		.map((part) => Number(part.trim()))
		.filter((part) => Number.isFinite(part));
	if (values.length === 0) {
		return fallback;
	}
	const min = values[0] ?? fallback.min;
	const max = values[1] ?? min;
	return { min: Math.min(min, max), max: Math.max(min, max) };
}

export function parseServerPower(value: string): ServerPower {
	const values = value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	if (values.length > 1) {
		const powers = values.map(Number).filter(Number.isFinite);
		if (powers.length > 0) {
			return powers;
		}
	}
	return parseRange(value, { min: 1, max: 1 });
}

export function formatValue(value: number): string {
	return Number.isInteger(value)
		? String(value)
		: value.toFixed(1).replace(/\.0$/, "");
}
