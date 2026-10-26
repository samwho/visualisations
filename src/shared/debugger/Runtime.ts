import type { DebuggerProgram, Scope } from "./Program";

export class Debugger {
	private generator?: Generator<Scope, void>;

	private readonly history: Scope[] = [];

	private index = -1;

	constructor(private readonly program: DebuggerProgram) {}

	get variableNames(): readonly string[] {
		return this.program.variableNames;
	}

	get scope(): Scope | undefined {
		return this.history[this.index];
	}

	step(): boolean {
		if (this.index + 1 < this.history.length) {
			this.index += 1;
			return true;
		}
		this.generator ??= this.program.create();
		const next = this.generator.next();
		if (next.done) {
			return false;
		}
		this.history.push(structuredClone(next.value));
		this.index += 1;
		return true;
	}

	stepBack(): boolean {
		if (this.index < 0) {
			return false;
		}
		this.index -= 1;
		return true;
	}

	restart(): void {
		this.generator = undefined;
		this.history.length = 0;
		this.index = -1;
	}

	initialArray(name: string): number[] {
		while (this.step()) {
			const value = this.scope?.[name];
			if (Array.isArray(value)) {
				this.restart();
				return value;
			}
		}
		this.restart();
		return [];
	}
}
