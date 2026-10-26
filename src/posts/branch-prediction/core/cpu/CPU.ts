import type { Instruction } from "./Instructions";
import { Stack } from "./Stack";

export class CPU {
	stack: Stack = new Stack();

	program: Instruction[] = [];

	pc = 0;

	constructor(program: Instruction[]) {
		this.program = program;
	}

	execute() {
		while (this.pc < this.program.length) {
			const instruction = this.program[this.pc]!;
			instruction.execute(this);
			this.pc++;
		}
	}
}
