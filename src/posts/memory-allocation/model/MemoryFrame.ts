export type ByteKind = "available" | "allocated" | "reserved" | "metadata";
export type MetadataKind = "size" | "free" | "allocated";
export type FreeListKind = "default" | "small" | "large";
export type Presentation = "article" | "playground";

/** A completed call, with workload IDs resolved to actual addresses. */
export type Operation =
	| { kind: "malloc"; size: number; address: number }
	| { kind: "free"; size: number; address: number };

export interface MemoryByte {
	address: number;
	kind: ByteKind;
	color?: string;
	opacity?: number;
	metadataKind?: MetadataKind;
	value?: number;
	freeBlockId?: string;
	freeBlockStart?: boolean;
	freeBlockEnd?: boolean;
	freeList?: FreeListKind;
	isCursor?: boolean;
}

export interface RangeAnnotation {
	address: number;
	size: number;
	color: string;
	role?: FreeListKind | "cursor";
}

export interface TextAnnotation {
	address: number;
	text: string;
	/** Omitted when the label should choose its colour from the byte background. */
	color?: string;
	metadataKind?: MetadataKind;
}

export interface PointerAnnotation {
	address: number;
	target: number;
	color: string;
}

/** A complete display state. Array position, rather than elapsed time, selects it. */
export interface Snapshot {
	bytes: MemoryByte[];
	freeBlockCount: number;
	operation?: Operation;
	ranges?: RangeAnnotation[];
	texts?: TextAnnotation[];
	pointers?: PointerAnnotation[];
}
