import type {
	MemoryByte,
	Operation,
	PointerAnnotation,
	Presentation,
	RangeAnnotation,
	Snapshot,
	TextAnnotation,
} from "../model/MemoryFrame";
import type { RuntimeAnnotation } from "./AllocatorRuntime";

export const THREAD_COLORS = Array.from(
	{ length: 5 },
	(_, index) => `var(--color-memory-thread-${index + 1})`,
);
const DEFAULT_COLOR = "var(--memory-allocated)";
const DEFAULT_ANNOTATION_COLOR = "var(--color-memory-annotation)";

function cssColor(
	value: number | string | null | undefined,
	fallback: string,
): string {
	if (value === null || value === undefined) {
		return fallback;
	}
	const text = String(value);
	// Record semantic references without resolving them against a browser theme.
	if (THREAD_COLORS.includes(text)) {
		return text;
	}
	const parsed = text.startsWith("#")
		? Number.parseInt(text.slice(1), 16)
		: Number(text);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	const color = parsed;
	return `#${Math.max(0, color).toString(16).padStart(6, "0").slice(-6)}`;
}

/** Records display state, not allocator behaviour. Nothing is executed when seeking. */
export class MemoryRecording {
	private readonly bytes: MemoryByte[];

	private usesFreeLists = false;

	private readonly ranges = new Map<number, RangeAnnotation>();

	private readonly texts = new Map<number, TextAnnotation>();

	private readonly pointers = new Map<number, PointerAnnotation>();

	peakMemory = 0;

	constructor(
		size: number,
		private readonly presentation: Presentation,
	) {
		this.bytes = Array.from({ length: size }, (_, address) =>
			this.availableByte(address),
		);
	}

	private availableByte(address: number): MemoryByte {
		return this.presentation === "article"
			? { address, kind: "available" }
			: {
					address,
					kind: "available",
					color: cssColor(DEFAULT_COLOR, DEFAULT_COLOR),
					opacity: 0.3,
				};
	}

	allocate(
		address: number,
		size: number,
		color?: number | string | null,
	): void {
		for (let offset = 0; offset < size; offset += 1) {
			const byte = this.bytes[address + offset]!;
			if (byte.kind === "allocated") {
				throw new Error(
					`Attempted to allocate memory at 0x${byte.address.toString(16)} twice`,
				);
			}
			byte.kind = "allocated";
			if (this.presentation === "playground") {
				byte.color = cssColor(color, DEFAULT_COLOR);
				byte.opacity = 1;
			}
			this.peakMemory = Math.max(this.peakMemory, byte.address);
		}
	}

	free(address: number, size: number): void {
		for (let offset = 0; offset < size; offset += 1) {
			this.bytes[address + offset] = this.availableByte(address + offset);
		}
	}

	annotate(annotation: RuntimeAnnotation): void {
		const { address } = annotation;
		const color = cssColor(annotation.color, DEFAULT_ANNOTATION_COLOR);
		switch (annotation.type) {
			case "range":
				this.usesFreeLists ||=
					annotation.role !== undefined && annotation.role !== "cursor";
				this.ranges.set(address, {
					address,
					size: annotation.size ?? 1,
					color,
					role: annotation.role,
				});
				break;
			case "text":
				this.texts.set(address, {
					address,
					text: String(annotation.text ?? ""),
					color:
						annotation.color === null || annotation.color === undefined
							? undefined
							: color,
					metadataKind: annotation.metadataKind,
				});
				break;
			case "pointer":
				if (annotation.target !== undefined) {
					this.pointers.set(address, {
						address,
						target: annotation.target,
						color,
					});
				}
				break;
			case "color": {
				const byte = this.bytes[address];
				if (byte && this.presentation === "playground") {
					byte.color = color;
					byte.opacity = annotation.alpha ?? 1;
				}
				break;
			}
			case "removeRange":
				this.ranges.delete(address);
				break;
			case "removeText":
				this.texts.delete(address);
				break;
			case "removePointer":
				this.pointers.delete(address);
				break;
			case "removeColor": {
				const byte = this.bytes[address];
				if (byte && this.presentation === "playground") {
					byte.color = cssColor(DEFAULT_COLOR, DEFAULT_COLOR);
					byte.opacity = 0.3;
				}
				break;
			}
		}
	}

	snapshot(operation?: Operation): Snapshot {
		const frame: Snapshot = {
			bytes: this.bytes.map((byte) => ({ ...byte })),
			freeBlockCount: 0,
			operation,
			ranges: [...this.ranges.values()],
			texts: [...this.texts.values()],
			pointers: [...this.pointers.values()],
		};
		if (this.presentation === "article") {
			this.decorateArticle(frame);
		}
		return frame;
	}

	/** The article uses semantic byte styling; the playground keeps editable annotations. */
	private decorateArticle(frame: Snapshot): void {
		// For a free-list allocator, unused bytes outside its free blocks are
		// reserved. This also handles malloc(0) after the last free block disappears.
		if (this.usesFreeLists) {
			for (const byte of frame.bytes) {
				if (byte.kind === "available") {
					byte.kind = "reserved";
				}
			}
		}
		for (const range of this.ranges.values()) {
			if (range.role === "cursor") {
				const byte = frame.bytes[range.address];
				if (byte) {
					byte.isCursor = true;
				}
			} else if (range.role) {
				frame.freeBlockCount += 1;
				for (let offset = 0; offset < range.size; offset += 1) {
					const byte = frame.bytes[range.address + offset]!;
					byte.kind = "available";
					byte.freeBlockId = `${range.role}-${range.address}`;
					byte.freeBlockStart = offset === 0;
					byte.freeBlockEnd = offset === range.size - 1;
					byte.freeList = range.role;
				}
			}
		}
		for (const text of this.texts.values()) {
			if (text.metadataKind) {
				const byte = frame.bytes[text.address]!;
				byte.kind = "metadata";
				byte.metadataKind = text.metadataKind;
				byte.value = Number(text.text);
			}
		}
		frame.ranges = frame.ranges?.filter((range) => !range.role);
		frame.texts = frame.texts?.filter((text) => !text.metadataKind);
	}
}
