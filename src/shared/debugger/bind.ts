import { Debugger } from "./components/Debugger";
import "./components/ArrayViewer";
import type { BoundDebuggerProgram } from "./Program";

export function bindDebuggers(
	root: Document,
	programs: readonly BoundDebuggerProgram[],
): void {
	const elements = root.querySelectorAll("s-debugger");
	if (elements.length !== programs.length) {
		throw new Error("Debugger markup and compiled programs disagree");
	}
	for (const [index, element] of elements.entries()) {
		const program = programs[index]!;
		if (!(element instanceof Debugger)) {
			throw new TypeError("Debugger component has not been registered");
		}
		if (element.id === "") {
			let id = program.id;
			while (root.getElementById(id)) {
				id += "-";
			}
			element.id = id;
		}
		element.setProgram(program);
	}
}
