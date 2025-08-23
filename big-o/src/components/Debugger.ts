import { highlight, STRING_SEPARATOR } from "../../cli/highlight";
import { BaseElement } from "../core/BaseElement";
import { code, pre } from "../core/DOM";
import { dedent } from "../core/Utils";
import { type Scope, Debugger as CoreDebugger } from "../../cli/debugger";

type OnStepCallback = (line: number, scope: Scope) => void;
type OnReachedEndCallback = () => void;
type OnReachedStartCallback = () => void;
type OnRestartCallback = () => void;

export class Debugger extends BaseElement {
  debugger!: CoreDebugger;

  private onStepCallbacks: OnStepCallback[] = [];
  private onReachedEndCallbacks: OnReachedEndCallback[] = [];
  private onReachedStartCallbacks: OnReachedStartCallback[] = [];
  private onRestartCallbacks: OnRestartCallback[] = [];

  private lineOffset: number = 0;
  private visibleLines: Set<number> = new Set();

  init() {
    const preElements = this.querySelectorAll("pre");
    if (!preElements.length) {
      throw new Error("Debugger component requires at least 1 <pre> element");
    }

    let mainSource: string | undefined;
    let source: string = "";
    preElements.forEach((element) => {
      if ("main" in element.attributes) {
        if (mainSource) {
          throw new Error("Multiple <pre main> elements found");
        }
        this.lineOffset = source.split("\n").length - 1;
        mainSource = dedent(element.innerText).trim();
        for (let i = 0; i < mainSource.split("\n").length; i++) {
          this.visibleLines.add(i + this.lineOffset + 1);
        }
      }
      source += element.innerText + "\n";
    });

    if (!mainSource) {
      mainSource = dedent(source).trim();
    }

    this.debugger = new CoreDebugger(source.trim());

    this.replaceChildren(pre(code({ innerHTML: highlight(mainSource) })));

    this.onStep((line, scope) => {
      this.setLine(line);
    });
  }

  onStep(callback: OnStepCallback) {
    this.onStepCallbacks.push(callback);
  }

  onRestart(callback: OnRestartCallback) {
    this.onRestartCallbacks.push(callback);
  }

  onReachedEnd(callback: OnReachedEndCallback) {
    this.onReachedEndCallbacks.push(callback);
  }

  onReachedStart(callback: OnReachedStartCallback) {
    this.onReachedStartCallbacks.push(callback);
  }

  step(): boolean {
    while (true) {
      if (!this.debugger.step()) {
        this.fireReachedEndCallbacks();
        return false;
      }

      const line = this.debugger.line!;
      const scope = this.debugger.scope!;

      if (this.visibleLines.size > 0 && !this.visibleLines.has(line)) {
        continue;
      }

      this.fireStepCallbacks(line - this.lineOffset, scope);
      return true;
    }
  }

  stepBack(): boolean {
    while (true) {
      if (!this.debugger.stepBack()) {
        this.setLine(undefined);
        this.fireReachedStartCallbacks();
        return false;
      }

      const line = this.debugger.line!;
      const scope = this.debugger.scope!;

      if (this.visibleLines.size > 0 && !this.visibleLines.has(line)) {
        continue;
      }

      this.fireStepCallbacks(line - this.lineOffset, scope);
      return true;
    }
  }

  restart() {
    this.debugger.restart();
    this.setLine(undefined);
    this.fireRestartCallbacks();
  }

  evaluateExpression(expression: string, scope: Scope): any {
    const f = new Function(...Object.keys(scope), `return ${expression};`);
    return f(...Object.values(scope));
  }

  fireStepCallbacks(line: number, scope: Scope) {
    for (const callback of this.onStepCallbacks) {
      callback(line, scope);
    }
  }

  fireRestartCallbacks() {
    for (const callback of this.onRestartCallbacks) {
      callback();
    }
  }

  fireReachedEndCallbacks() {
    for (const callback of this.onReachedEndCallbacks) {
      callback();
    }
  }

  fireReachedStartCallbacks() {
    for (const callback of this.onReachedStartCallbacks) {
      callback();
    }
  }

  get currentLine(): HTMLElement | null {
    return this.querySelector(".line.selected");
  }

  get currentLineNumber(): number | undefined {
    const line = this.currentLine;
    if (!line) {
      return undefined;
    }
    return parseInt(line.dataset.lineNum || "0", 10);
  }

  get currentLineIdentifiers(): string[] {
    const line = this.currentLine;
    if (!line) {
      return [];
    }
    const identifiers = line.dataset.identifiers;
    if (!identifiers) {
      return [];
    }
    return identifiers.split(STRING_SEPARATOR).filter((id) => id.trim() !== "");
  }

  get currentLineExpressions(): string[] {
    const line = this.currentLine;
    if (!line) {
      return [];
    }
    const expressions = line.dataset.expressions;
    if (!expressions) {
      return [];
    }
    return expressions
      .split(STRING_SEPARATOR)
      .filter((expr) => expr.trim() !== "");
  }

  getLine(lineNumber: number): HTMLElement | null {
    return this.querySelector(
      `.line[data-line-num="${lineNumber}"]`
    ) as HTMLElement | null;
  }

  getIdentifier(identifier: string): HTMLElement | null {
    const line = this.currentLine;
    if (!line) {
      return null;
    }
    return line.querySelector(
      `span[data-type="identifier"][data-name="${identifier}"]`
    );
  }

  setLine(lineNumber: number | undefined) {
    this.currentLine?.classList.remove("selected");
    if (lineNumber === undefined) {
      return;
    }

    const line = this.getLine(lineNumber);
    if (!line) {
      throw new Error(`Line ${lineNumber} not found`);
    }

    // This forces the element to reflow, which resets the animation.
    // Without this, stepping to the line line as before (e.g. in a loop)
    // won't retrigger the flash.
    // https://stackoverflow.com/questions/50612096/
    line.offsetHeight;

    line.classList.add("selected");
  }
}
