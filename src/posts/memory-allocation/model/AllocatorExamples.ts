import stack from "../allocators/stack.js" with { type: "text" };
import freeList from "../allocators/freelist.js" with { type: "text" };
import segmentedFreeList from "../allocators/segmented-freelist.js" with { type: "text" };
import boundaryTags from "../allocators/inline.js" with { type: "text" };
import annotations from "../allocators/annotations.js" with { type: "text" };

export const ALLOCATOR_EXAMPLES = {
	"/js/allocators/stack.js": stack,
	"/js/allocators/freelist.js": freeList,
	"/js/allocators/segmented-freelist.js": segmentedFreeList,
	"/js/allocators/inline.js": boundaryTags,
	"/js/allocators/annotations.js": annotations,
};
