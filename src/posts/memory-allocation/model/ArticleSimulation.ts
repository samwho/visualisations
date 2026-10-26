import manual from "../allocators/manual.js" with { type: "text" };
import bump from "../allocators/stack.js" with { type: "text" };
import freeList from "../allocators/freelist.js" with { type: "text" };
import segregated from "../allocators/segmented-freelist.js" with { type: "text" };
import boundaryTags from "../allocators/inline.js" with { type: "text" };
import type { AllocatorOptions } from "../runtime/AllocatorRuntime";
import { Simulation, type AllocatorCall } from "../runtime/Simulation";

const ALLOCATORS = {
	manual,
	bump,
	"free-list": freeList,
	"segregated-free-list": segregated,
	"boundary-tags": boundaryTags,
};

export type AllocatorKind = keyof typeof ALLOCATORS;

export function simulateArticle(
	allocator: AllocatorKind,
	options: AllocatorOptions,
	calls: AllocatorCall[],
) {
	// Only repository-owned source is bundled here. Reader code is executed only
	// in the playground, not fetched or taken from article markup.
	return Simulation.fromString(ALLOCATORS[allocator], options, "article").run(
		calls,
	);
}
