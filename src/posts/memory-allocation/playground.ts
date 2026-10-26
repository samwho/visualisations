import type { Button } from "../../shared/components/Button";
import "../../shared/components/Button";
import "../../shared/components/Card";
import "../../shared/components/Select";
import "../../shared/components/RadioGroup";
import "../../shared/components/Slider";
import "./components/CallRail";
import "./components/Icon";
import "./components/Memory";
import "../../shared/components/SplitPane";
import "./components/TimelineControls";

function showOutput(view: "memory" | "logs"): void {
	document.querySelector<HTMLElement>(".view-controls")!.dataset.view = view;
	for (const name of ["memory", "logs"] as const) {
		const selected = name === view;
		document.getElementById(`${name}-container`)!.hidden = !selected;
		const button = document.querySelector<Button>(`#show-${name}`)!;
		button.pressed = selected;
		button.toggleAttribute("data-pressed", selected);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	document
		.querySelector("#show-memory")!
		.addEventListener("click", () => showOutput("memory"));
	document
		.querySelector("#show-logs")!
		.addEventListener("click", () => showOutput("logs"));
});

export { compressCode, decodeSharedCode } from "../../shared/core/SharedCode";
export { ALLOCATOR_EXAMPLES } from "./model/AllocatorExamples";
export { ALLOCATOR_PREAMBLE_LINES, Simulation } from "./runtime/Simulation";
export { ElementParser } from "./runtime/ElementParser";
export { MemoryRecording } from "./runtime/MemoryRecording";
export { Memory } from "./components/Memory";
export { configureEditorAccessibility } from "../../shared/core/CodeEditorAccessibility";
