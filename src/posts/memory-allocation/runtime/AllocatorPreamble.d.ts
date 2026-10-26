import type { AllocatorOptions, AllocatorRuntime } from "./AllocatorRuntime";

export const ALLOCATOR_PREAMBLE_LINES: number;
export function createAllocatorRuntime(
	code: string,
	options: AllocatorOptions,
): AllocatorRuntime;
