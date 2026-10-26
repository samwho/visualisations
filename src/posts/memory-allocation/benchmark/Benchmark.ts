import { createAllocatorRuntime } from "../runtime/AllocatorPreamble.js";
import { validateAllocation } from "../runtime/AllocatorRuntime";

export interface BenchmarkCall {
	function: string;
	args: number[];
	id?: number | string | null;
	threadId?: number;
}

export interface BenchmarkOptions {
	code: string;
	calls: BenchmarkCall[];
	bytes: number;
	durationMs: number;
}

export interface BenchmarkResult {
	opsPerSecond: number;
	runs: number;
	operations: number;
}

function runSample(code: string, calls: BenchmarkCall[], bytes: number) {
	const allocator = createAllocatorRuntime(code, { bytes, debug: false });
	const allocations = new Map<number | string, number>();
	let operations = 0;
	const startedAt = performance.now();

	for (const call of calls) {
		allocator.setThread(call.threadId ?? 0);
		if (call.function === "malloc") {
			const size = call.args[0] ?? 0;
			const address = allocator.malloc(size);
			validateAllocation(address, size, bytes);
			allocations.set(call.id ?? address, address);
			operations += 1;
		} else if (call.function === "free") {
			const allocationId = call.id ?? call.args[0];
			if (allocationId === undefined) {
				continue;
			}
			const address = allocations.get(allocationId) ?? call.args[0];
			if (address === undefined) {
				continue;
			}
			allocator.free(address);
			allocations.delete(allocationId);
			operations += 1;
		}
	}

	return { operations, elapsedMs: performance.now() - startedAt };
}

export function benchmarkAllocator({
	code,
	calls,
	bytes,
	durationMs,
}: BenchmarkOptions): BenchmarkResult {
	const deadline = performance.now() + durationMs;
	let runs = 0;
	let operations = 0;
	let elapsedMs = 0;

	while (performance.now() < deadline || runs === 0) {
		const sample = runSample(code, calls, bytes);
		runs += 1;
		operations += sample.operations;
		elapsedMs += sample.elapsedMs;
	}

	return {
		opsPerSecond: elapsedMs > 0 ? (operations / elapsedMs) * 1000 : 0,
		runs,
		operations,
	};
}
