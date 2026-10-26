import "./Icon";
import { customElement } from "lit/decorators.js";
import {
	TermElement,
	type HighlightStyle,
} from "../../../shared/components/Term";
import { sliderTerm } from "../../../shared/components/SliderTerm";

type MemoryIcon =
	| "allocated"
	| "available"
	| "cursor"
	| "free-list"
	| "highlighted"
	| "large-free-list"
	| "metadata-free"
	| "metadata-size"
	| "reserved"
	| "small-free-list"
	| "usable";

const ICON_BY_WORD = {
	allocated: "allocated",
	"allocated memory": "allocated",
	allocation: "allocated",
	allocations: "allocated",
	used: "allocated",
	available: "available",
	"available memory": "available",
	reserved: "reserved",
	"next block": "cursor",
	"next allocation": "cursor",
	"free list": "free-list",
	"free list entry": "free-list",
	"free list entries": "free-list",
	"free-list": "free-list",
	"free-list entry": "free-list",
	"free-list entries": "free-list",
	"highlighted block": "highlighted",
	"free block": "free-list",
	"free blocks": "free-list",
	"small pool": "small-free-list",
	"big pool": "large-free-list",
	size: "metadata-size",
	metadata: "metadata-size",
	bookkeeping: "metadata-size",
	free: "metadata-free",
	"usable memory": "usable",
} satisfies Record<string, MemoryIcon>;

const COLOR_BY_ICON: Record<MemoryIcon, string> = {
	allocated: "var(--memory-text-allocated)",
	available: "var(--memory-text-available)",
	reserved: "var(--memory-text-reserved)",
	cursor: "var(--memory-text-cursor)",
	"free-list": "var(--memory-text-free-list)",
	highlighted: "var(--color-palette-blue-foreground)",
	"small-free-list": "var(--memory-text-segregated-free-list)",
	"large-free-list": "var(--memory-text-segregated-free-list)",
	"metadata-size": "var(--memory-text-size)",
	"metadata-free": "var(--memory-text-free)",
	usable: "var(--memory-text-usable)",
};

const WORDS = {
	...Object.fromEntries(
		Object.entries(ICON_BY_WORD).map(([word, icon]) => [
			word,
			{ color: COLOR_BY_ICON[icon], icon },
		]),
	),
	malloc: { color: "var(--memory-text-allocated)", icon: "" },
	"free function": {
		color: "var(--memory-text-free)",
		icon: "",
	},
	reset: { icon: "arrow_counterclockwise" },
	slider: sliderTerm,
} satisfies Record<string, HighlightStyle>;

@customElement("t-")
export class Term extends TermElement {
	static override words = WORDS;
}
