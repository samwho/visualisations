import { deepClone } from "../src/core/Utils";
import { transform } from "./transform";

export interface Scope {
  [key: string]: any;
}

export class Debugger {
  readonly code: string;
  readonly transformed: string;

  private _scope: Scope | undefined;
  private _line: number | undefined;
  private _generator: Generator<any, any, Scope> | undefined;
  private _breakpoints: Set<number> = new Set();

  private _scopeHistory: Scope[] = [];
  private _scopeIndex: number = 0;

  constructor(code: string) {
    this.code = code;
    this.transformed = transform(this.code);
  }

  step(): boolean {
    if (!this._generator) {
      this._generator = new Function(`
        function* __main() {
          ${this.transformed}
        }
        return __main();
      `)();
    }

    if (this._scopeIndex < this._scopeHistory.length) {
      const { line, ...scope } = this._scopeHistory[this._scopeIndex]!;
      this._line = line;
      this._scope = scope;
      this._scopeIndex++;
      return true;
    }

    const { value, done } = this._generator!.next();
    if (done) {
      return false;
    }

    const clonedValue = deepClone(value);
    const { line, ...scope } = clonedValue;
    this._scope = scope;
    this._line = line;
    this._scopeHistory.push(clonedValue);
    this._scopeIndex++;
    return true;
  }

  stepBack(): boolean {
    if (this._scopeIndex === 0) {
      this._line = undefined;
      this._scope = undefined;
      return false;
    } else if (this._scopeIndex > 1) {
      this._scopeIndex--;
      const { line, ...scope } = this._scopeHistory[this._scopeIndex - 1]!;
      this._line = line;
      this._scope = scope;
      return true;
    }
    return false;
  }

  run(): Scope[] {
    const steps: Scope[] = [];
    while (this.step()) {
      steps.push({ ...this.scope, line: this.line });
      if (this._breakpoints.has(this.line!)) {
        break;
      }
    }
    return steps;
  }

  restart(): void {
    this._scope = undefined;
    this._line = undefined;
    this._generator = undefined;
    this._scopeHistory = [];
    this._scopeIndex = 0;
  }

  getFirstValueOf(identifier: string): any {
    this.restart();
    while (this.step()) {
      if (this.scope && identifier in this.scope) {
        const value = this.scope[identifier];
        this.restart();
        return value;
      }
    }
    return undefined;
  }

  addBreakpoint(line: number): void {
    this._breakpoints.add(line);
  }

  removeBreakpoint(line: number): void {
    this._breakpoints.delete(line);
  }

  get scope() {
    return this._scope;
  }

  get line() {
    return this._line;
  }
}
