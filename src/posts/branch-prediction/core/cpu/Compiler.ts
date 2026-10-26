import {
	Add,
	Div,
	type Instruction,
	JumpZero,
	Label,
	Mul,
	Pop,
	Push,
	Sub,
} from "./Instructions";

export function compile(sourceCode: string): Instruction[] {
	const program: Instruction[] = [];
	for (const [lineNumber, line] of sourceCode.split("\n").entries()) {
		program.push(lineToInstruction(lineNumber, line));
	}
	return program;
}

function lineToInstruction(lineNumber: number, line: string): Instruction {
	const [opcode, ...operands] = line.trim().split(" ");
	if (opcode?.endsWith(":")) {
		return new Label(lineNumber, opcode.slice(0, -1));
	}

	switch (opcode) {
		case "pop":
			return new Pop(lineNumber);
		case "push":
			return new Push(lineNumber, Number(operands[0]));
		case "add":
			return new Add(lineNumber);
		case "sub":
			return new Sub(lineNumber);
		case "mul":
			return new Mul(lineNumber);
		case "div":
			return new Div(lineNumber);
		case "jz":
			if (operands.length !== 1) {
				throw new Error(`Invalid operands for jz on line ${lineNumber}`);
			}
			return new JumpZero(lineNumber, operands[0]!);
		default:
			throw new Error(`Unknown opcode: ${opcode}`);
	}
}
