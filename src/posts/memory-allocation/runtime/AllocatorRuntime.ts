import type { FreeListKind, MetadataKind } from "../model/MemoryFrame";

export interface AllocatorOptions {
	bytes: number;
	debug: boolean;
	coalesce?: boolean;
	minsize?: number;
	smallfreelistsize?: number;
	smallfreelistthreshold?: number;
}

export interface AllocatorLog {
	level: "info" | "warn" | "error";
	message: string;
}

export interface RuntimeAnnotation {
	type: string;
	address: number;
	target?: number;
	text?: string | number;
	alpha?: number;
	size?: number;
	color?: number | null;
	role?: FreeListKind | "cursor";
	metadataKind?: MetadataKind;
}

/** The API returned by the reader's allocator and its injected helpers. */
export interface AllocatorRuntime {
	setThread(thread: number): void;
	malloc(size: number, address?: number): number;
	free(address: number): void;
	getNewAnnotations(): RuntimeAnnotation[];
	getNewLogs(): AllocatorLog[];
	options: AllocatorOptions;
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
}

export class OutOfMemoryError extends Error {
	constructor(message = "Allocator ran out of memory") {
		super(message);
		this.name = "OutOfMemory";
	}
}

/** Reader-supplied JavaScript can return values outside its declared type. */
export function validateAllocation(
	address: unknown,
	size: number,
	bytes: number,
): asserts address is number {
	if (!Number.isInteger(address)) {
		throw new TypeError(
			`Invalid allocation address: ${String(address)}; expected a finite integer`,
		);
	}
	// SAFETY: Number.isInteger rejects all non-number values, NaN, and infinities.
	const allocationAddress = address as number;
	if (allocationAddress === -1 || allocationAddress + size > bytes) {
		throw new OutOfMemoryError();
	}
	if (allocationAddress < 0) {
		throw new Error(`Returned a negative address: ${allocationAddress}`);
	}
}
