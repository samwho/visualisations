import { createAllocatorRuntime } from "./AllocatorPreamble.js";
import {
	type AllocatorLog,
	type AllocatorOptions,
	type AllocatorRuntime,
	validateAllocation,
} from "./AllocatorRuntime";
import type { Operation, Presentation, Snapshot } from "../model/MemoryFrame";
import { MemoryRecording } from "./MemoryRecording";

export { ALLOCATOR_PREAMBLE_LINES } from "./AllocatorPreamble.js";

export interface AllocatorCall {
	function: "malloc" | "free";
	args: number[];
	id?: string | number;
	/** Only the introductory manual allocator accepts an explicit address. */
	address?: number;
	threadId: number;
	time: number;
	color?: number | string;
}

/** Both the article and editor execute here, once, before the reader starts scrubbing. */
export class Simulation {
	static fromString(
		code: string,
		options: AllocatorOptions,
		presentation: Presentation = "playground",
	): Simulation {
		return new Simulation(createAllocatorRuntime(code, options), presentation);
	}

	readonly logs: AllocatorLog[] = [];

	readonly snapshots: Snapshot[] = [];

	peakMemory = 0;

	private constructor(
		private readonly runtime: AllocatorRuntime,
		private readonly presentation: Presentation,
	) {}

	run(calls: AllocatorCall[]): Snapshot[] {
		const allocations = new Map<
			string | number,
			{ address: number; size: number }
		>();
		const memory = new MemoryRecording(
			this.runtime.options.bytes,
			this.presentation,
		);
		this.snapshots.length = 0;
		const annotate = () => {
			for (const annotation of this.runtime.getNewAnnotations()) {
				memory.annotate(annotation);
			}
		};

		annotate();
		this.snapshots.push(memory.snapshot());
		try {
			for (const call of calls) {
				this.runtime.setThread(call.threadId);
				let operation: Operation;
				if (call.function === "malloc") {
					const size = call.args[0] ?? 0;
					const address = this.runtime.malloc(size, call.address);
					try {
						validateAllocation(address, size, this.runtime.options.bytes);
					} catch (error) {
						this.runtime.error(
							`malloc(${size}) returned ${String(address)}: ${String(error)}`,
						);
						throw error;
					}
					this.runtime.info(`malloc(${size}) = 0x${address.toString(16)}`);
					memory.allocate(address, size, call.color);
					allocations.set(call.id ?? address, { address, size });
					operation = { kind: "malloc", size, address };
				} else {
					const id = call.id ?? call.args[0];
					const allocation = id === undefined ? undefined : allocations.get(id);
					if (!allocation) {
						continue;
					}
					this.runtime.free(allocation.address);
					memory.free(allocation.address, allocation.size);
					allocations.delete(id!);
					this.runtime.info(`free(0x${allocation.address.toString(16)})`);
					operation = {
						kind: "free",
						size: allocation.size,
						address: allocation.address,
					};
				}
				annotate();
				this.snapshots.push(memory.snapshot(operation));
			}
		} finally {
			this.logs.splice(0, this.logs.length, ...this.runtime.getNewLogs());
			this.peakMemory = memory.peakMemory;
		}
		return this.snapshots;
	}
}
