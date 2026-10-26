import {
	type BenchmarkOptions,
	benchmarkAllocator,
} from "./benchmark/Benchmark";

interface BenchmarkMessage extends BenchmarkOptions {
	id: number;
}

// This entry point runs in a dedicated worker. Its caller owns the message contract.
globalThis.addEventListener(
	"message",
	({ data }: MessageEvent<BenchmarkMessage>) => {
		try {
			globalThis.postMessage({ id: data.id, ...benchmarkAllocator(data) });
		} catch (error) {
			globalThis.postMessage({
				id: data.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	},
);
