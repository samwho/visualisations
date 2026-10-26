import { parse } from "./TlangParser";

interface Position {
	offset: number;
	line: number;
	column: number;
}

interface Location {
	source: string;
	start: Position;
	end: Position;
}

interface Text {
	text: string;
	location: Location;
}

interface BaseInstruction {
	id: string;
	branch: Branch;
	index: number;
	location: Location;
}

interface LeftInstruction extends BaseInstruction {
	type: "left";
}

interface RightInstruction extends BaseInstruction {
	type: "right";
}

interface PrintInstruction extends BaseInstruction {
	type: "print";
	value: string;
}

interface HaltInstruction extends BaseInstruction {
	type: "halt";
}

interface GotoInstruction extends BaseInstruction {
	type: "goto";
	label: string;
}

export type Instruction =
	| LeftInstruction
	| RightInstruction
	| PrintInstruction
	| HaltInstruction
	| GotoInstruction;

export interface Branch {
	index: number;
	instructions: Instruction[];
	label: string;
	read: string;
}

export type Program = Record<
	string,
	Record<string, Omit<Branch, "label" | "read">>
>;

export type ProgramRaw = ProgramLine[];

export interface ProgramLine {
	label: Text;
	read: Text;
	instructions: Instruction[];
	index: number;
}

export function branches(
	program: Program,
	sortKeys: ("index" | "label" | "read")[] = ["index"],
): Branch[] {
	const result: Branch[] = [];
	for (const [label, stateBranches] of Object.entries(program)) {
		for (const [read, branch] of Object.entries(stateBranches)) {
			result.push({
				label,
				read,
				...branch,
			});
		}
	}

	return result.sort((a, b) => {
		for (const key of sortKeys) {
			if (a[key] < b[key]) {
				return -1;
			}
			if (a[key] > b[key]) {
				return 1;
			}
		}
		return 0;
	});
}

export const Compiler = {
	parse(input: string): ProgramLine[] {
		return parse(input);
	},

	// Format of a program:
	//
	//   0 | 0 | P(1) R -> 1
	//   0 | 1 | P(0) R -> 0
	//   1 | 0 | P(1) L -> 1
	//   1 | 1 | P(0) L -> 0
	text2program(input: string) {
		// SAFETY: a null-prototype dictionary stores only parsed program branches.
		const program = Object.create(null) as Program;
		const parsed = parse(input.trim());
		let id = 1;
		for (const branch of parsed) {
			const { label, read, instructions, index } = branch;
			// SAFETY: state dictionaries contain only compiled branches, never inherited properties.
			program[label.text] ??= Object.create(null) as Program[string];
			if (program[label.text]![read.text]) {
				throw new Error(
					`Duplicate instruction for: ${label.text} | ${read.text}`,
				);
			}
			for (let i = 0; i < instructions.length; i++) {
				const instruction = instructions[i]!;
				instruction.id = `${id++}`;
				instruction.branch = {
					index,
					label: label.text,
					read: read.text,
					instructions,
				};
				instruction.index = i;
			}
			program[label.text]![read.text] = {
				index,
				instructions,
			};
		}
		return program;
	},

	instruction2text(instruction: Instruction): string {
		switch (instruction.type) {
			case "left":
				return "L";
			case "right":
				return "R";
			case "print":
				return `P(${instruction.value || " "})`;
			case "halt":
				return "H";
			case "goto":
				return `-> ${instruction.label}`;
		}
	},

	instruction2pretty(instruction: Instruction): string {
		switch (instruction.type) {
			case "left":
				return "L";
			case "right":
				return "R";
			case "print":
				return `P(${instruction.value || "␣\uFE0E"})`;
			case "halt":
				return "H";
			case "goto":
				return `↪\uFE0E${instruction.label}`;
		}
	},

	program2text(program: Program): string {
		const table = branches(program).map(({ label, read, instructions }) => {
			return [
				label,
				read,
				instructions
					.map((instruction) => Compiler.instruction2text(instruction))
					.join(" "),
			];
		});
		return formatTable(table);
	},
};

function formatTable(rows: string[][]): string {
	if (rows.length === 0) {
		return "";
	}
	const columnWidths = rows[0]!.map(() => 0);
	for (const row of rows) {
		for (let i = 0; i < row.length; i++) {
			columnWidths[i] = Math.max(columnWidths[i]!, row[i]!.length);
		}
	}

	const lines: string[] = [];
	for (const row of rows) {
		const line = row
			.map((cell, i) => cell.padEnd(columnWidths[i]!))
			.join(" | ");
		lines.push(line);
	}

	return lines.join("\n");
}
