import { html, type TemplateResult } from "lit";
import type { CPU } from "./CPU";

function instructionHTML(s: string): TemplateResult<1> {
	return html`<span class="instruction ${s}">${s}</span>`;
}

function operand(s: string | number): TemplateResult<1> {
	return html`<span class="operand">${s.toString()}</span>`;
}

function labelHTML(s: string): TemplateResult<1> {
	return html`<span class="label">${s}</span>`;
}

export abstract class Instruction {
	constructor(public line: number) {}
	abstract execute(cpu: CPU): void;
	abstract toString(): string;
	abstract toHTML(): TemplateResult<1>;
}

export class Push extends Instruction {
	constructor(
		line: number,
		private value: number,
	) {
		super(line);
	}

	execute(cpu: CPU) {
		cpu.stack.push(this.value);
	}

	toString() {
		return `push ${this.value}`;
	}

	toHTML() {
		return html`${instructionHTML("push")} ${operand(this.value)}`;
	}
}

export class Pop extends Instruction {
	execute(cpu: CPU) {
		cpu.stack.pop();
	}

	toString() {
		return "pop";
	}

	toHTML() {
		return html`${instructionHTML("pop")}`;
	}
}

export class Add extends Instruction {
	execute(cpu: CPU) {
		const a = cpu.stack.pop();
		const b = cpu.stack.pop();
		cpu.stack.push(a + b);
	}

	toString() {
		return "add";
	}

	toHTML() {
		return html`${instructionHTML("add")}`;
	}
}

export class Sub extends Instruction {
	execute(cpu: CPU) {
		const a = cpu.stack.pop();
		const b = cpu.stack.pop();
		cpu.stack.push(b - a);
	}

	toString() {
		return "sub";
	}

	toHTML() {
		return html`${instructionHTML("sub")}`;
	}
}

export class Mul extends Instruction {
	execute(cpu: CPU) {
		const a = cpu.stack.pop();
		const b = cpu.stack.pop();
		cpu.stack.push(a * b);
	}

	toString() {
		return "mul";
	}

	toHTML() {
		return html`${instructionHTML("mul")}`;
	}
}

export class Div extends Instruction {
	execute(cpu: CPU) {
		const a = cpu.stack.pop();
		const b = cpu.stack.pop();
		cpu.stack.push(Math.floor(b / a));
	}

	toString() {
		return "div";
	}

	toHTML() {
		return html`${instructionHTML("div")}`;
	}
}

export class Label extends Instruction {
	constructor(
		line: number,
		public name: string,
	) {
		super(line);
	}

	execute() {}

	toString() {
		return `${this.name}:`;
	}

	toHTML() {
		return html`${labelHTML(this.name)}:`;
	}
}

export class JumpZero extends Instruction {
	constructor(
		line: number,
		private label: string,
	) {
		super(line);
	}

	execute(cpu: CPU) {
		const label = cpu.program.find(
			(instruction) =>
				instruction instanceof Label && instruction.name === this.label,
		);
		if (!label) {
			throw new Error(`Label ${this.label} not found`);
		}
		if (cpu.stack.pop() === 0) {
			cpu.pc = label.line;
		}
	}

	toString() {
		return `jz ${this.label}`;
	}

	toHTML() {
		return html`${instructionHTML("jz")} ${labelHTML(this.label)}`;
	}
}
