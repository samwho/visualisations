import { elastic } from "@juliendargelos/easings";
import { Easing, Tween } from "@tweenjs/tween.js";
import type GUI from "lil-gui";
import Two from "two.js";
import { Group } from "two.js/src/group";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { Text } from "two.js/src/text";
import { hasRequestedReducedMotion } from "../core/Accessibility";
import { BaseElement } from "../core/BaseElement";
import { HEAD, INSTRUCTION, STATE, VALUE } from "../core/Colors";
import { button, div, option, select, span, table, td, tr } from "../core/DOM";
import { Tweens } from "../core/Tweens";
import { roughlyEqual, sleep } from "../core/Utils";
import {
  Compiler,
  type Instruction,
  type Program,
  branches,
} from "../machine/Compiler";

interface State {
  state: string;
  tape: { minIndex: number; maxIndex: number; symbols: string[] };
  tapeIndex: number;
  instructionId: string;
  halted: boolean;
}

export class TuringMachine extends BaseElement {
  tape: Tape;

  program?: Program;
  programElement: HTMLElement;
  showProgram = false;

  controlsElement: HTMLElement;
  showControls = false;

  errorElement: HTMLElement;
  error: Error | undefined;

  playButton?: HTMLButtonElement;
  pauseButton?: HTMLButtonElement;
  restartButton?: HTMLButtonElement;
  stepButton?: HTMLButtonElement;
  stepBackButton?: HTMLButtonElement;
  speedSelector?: HTMLSelectElement;

  squareSize: number;

  state?: keyof Program;
  instruction?: Instruction;
  firstInstruction = true;
  instructionPointer: HTMLElement;
  statePointer: HTMLElement;
  valuePointer: HTMLElement;

  instructionPointerTween: Tween | undefined;
  statePointerTween: Tween | undefined;
  valuePointerTween: Tween | undefined;

  gradient: HTMLElement;

  _stepDuration = 750;
  _speedMultiplier = 1;

  _pause = true;
  _readerPressedPause = false;
  _endTweensCalled = false;
  _running = false;
  _halted = false;

  _history: State[] = [];

  _stepping = false;
  _stepFinishedCallbacks: (() => Promise<void> | void)[] = [];

  get stepDuration(): number {
    return (
      this._stepDuration / window.globalSpeedMultiplier / this._speedMultiplier
    );
  }

  set stepDuration(value: number) {
    this._stepDuration = value;
    this.tape.stepDuration = value;
  }

  set speedMultiplier(value: number) {
    this._speedMultiplier = value;
    this.tape.speedMultiplier = value;
  }

  async onResize() {
    this.centerScrollbar();
    this.applySticky();
  }

  async onPageResize() {
    this.applySticky();

    if (!this.isRunning()) {
      await this.resetPointers({ animate: false });
    }
  }

  async onVisible() {
    if (this._readerPressedPause) {
      return;
    }
    if (!this.program) {
      return;
    }
    this.resume();
  }

  async onHidden() {
    this.pause();
  }

  async init() {
    this.gradient = div({ classes: ["gradient"] });
    this.svgContainer.appendChild(this.gradient);

    this.squareSize = Number.parseInt(this.getAttribute("square-size") || "60");
    const showHead = (this.getAttribute("show-head") ?? "true") === "true";

    this.onDisconnect(() => {
      this._pause = true;
    });

    this.tape = new Tape({
      squareSize: this.squareSize,
      showHead,
      containerWidth: this.clientWidth,
      gui: this.gui,
      stepDuration: this.stepDuration,
    });

    const xMin = -this.squareSize * this.tape.squaresEitherSide;
    const xMax = this.squareSize * this.tape.squaresEitherSide;
    this.two.width = xMax - xMin;
    this.tape.position.set(this.two.width / 2, this.squareSize / 2);

    this.stepDuration = Number.parseInt(
      this.getAttribute("step-duration") || "750",
    );
    this.two.add(this.tape);
    this.two.height = this.squareSize;

    this.gui?.add(this, "stepDuration", 10, 1000).onChange((value: number) => {
      this.tape.stepDuration = value;
    });

    this.instructionPointer = div({
      classes: ["pointer"],
      style: { backgroundColor: INSTRUCTION.hex() },
    });
    this.statePointer = div({
      classes: ["pointer"],
      style: { backgroundColor: STATE.hex() },
    });
    this.valuePointer = div({
      classes: ["pointer"],
      style: { backgroundColor: VALUE.hex() },
    });
    this.programElement = div({ classes: ["program-container"] });
    this.controlsElement = div({ classes: ["controls-container"] });
    this.errorElement = div({ classes: ["error"] });

    this._readerPressedPause = true;
    this.restart({ animate: false });

    const shouldPlay = (this.getAttribute("play") ?? "false") === "true";
    if (shouldPlay) {
      this.run();
    }

    const controlsElement = this.querySelector(
      "controls",
    ) as HTMLElement | null;
    if (controlsElement) {
      this.showControls =
        (controlsElement.getAttribute("show") ?? "true") === "true";
      if (this.showControls) {
        this.container.appendChild(this.controlsElement);
        this.initControls(controlsElement);
      }
    }

    this.container.appendChild(this.errorElement);

    this.onResize();
    this.onPageResize();

    let startX: number;
    let scrollLeft: number;
    let isDragging = false;

    this.svgContainer.addEventListener("mousedown", (e) => {
      // do nothing for right click
      if (e.button === 2) {
        return;
      }
      isDragging = true;
      document.body.classList.add("dragging");
      this.svgContainer.classList.add("dragging");
      startX = e.pageX - this.svgContainer.offsetLeft;
      scrollLeft = this.svgContainer.scrollLeft;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.classList.remove("dragging");
      this.svgContainer.classList.remove("dragging");
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - this.svgContainer.offsetLeft;
      const walk = x - startX;
      this.svgContainer.scrollLeft = scrollLeft - walk;
    });
  }

  setError(e: Error) {
    this.error = e;
    this.errorElement.textContent = e.message;
    this.dispatch("error", { error: e });
  }

  clearError() {
    this.error = undefined;
    this.errorElement.textContent = "";
  }

  controlsSettings(controlsElement: HTMLElement) {
    const items = Object.values(controlsElement.attributes);
    if (items.length === 0) {
      return {
        play: true,
        pause: true,
        restart: true,
        step: true,
        stepBack: true,
        speed: true,
      };
    }

    const settings = {
      play: false,
      pause: false,
      restart: false,
      step: false,
      stepBack: false,
      speed: false,
    };
    for (const item of items) {
      const key = item.name as keyof typeof settings;
      if (!(key in settings)) continue;
      settings[key] = true;
    }
    return settings;
  }

  initControls(controlsElement: HTMLElement) {
    const settings = this.controlsSettings(controlsElement);

    if (settings.play) {
      this.playButton = button(
        {
          classes: ["play"],
          disabled: true,
          onClick: async () => {
            if (restarting) return;

            try {
              this.endTweens();
              if (this.isStepping()) {
                await this.stepFinished();
              }
              this._readerPressedPause = false;
              if (this.isPaused()) {
                this.resume();
              } else if (!this.isRunning()) {
                this.run();
              }
              hide(this.playButton);
              show(this.pauseButton);
            } catch (e) {
              console.error(e);
              this.setError(e as Error);
            }
          },
        },
        span({ text: "⏵\uFE0E", role: "img", ariaLabel: "Play" }),
      );
    }

    if (settings.pause) {
      this.pauseButton = button(
        {
          classes: ["pause"],
          onClick: async () => {
            if (restarting) return;

            try {
              this._readerPressedPause = true;
              await this.pause();
              show(this.playButton);
              hide(this.pauseButton);
            } catch (e) {
              console.error(e);
              this.setError(e as Error);
            }
          },
          style: { display: "none" },
        },
        span({ text: "⏸\uFE0E", role: "img", ariaLabel: "Pause" }),
      );
    }

    let restarting = false;
    if (settings.restart) {
      this.restartButton = button(
        {
          classes: ["restart"],
          onClick: async () => {
            try {
              restarting = true;
              disable(this.stepBackButton);
              await this.restart({ animate: false });
            } catch (e) {
              console.error(e);
              this.setError(e as Error);
            } finally {
              restarting = false;
            }
          },
        },
        span({ text: "⏮\uFE0E", role: "img", ariaLabel: "Restart" }),
      );
    }

    if (settings.step) {
      this.stepButton = button(
        {
          disabled: true,
          classes: ["step"],
          onClick: async () => {
            if (restarting) return;

            try {
              this.endTweens();
              requestAnimationFrame(async () => {
                if (this.isStepping()) {
                  return;
                }
                await this.step({ interactive: true });
              });
            } catch (e) {
              console.error(e);
              this.setError(e as Error);
            }
          },
        },
        span({ text: "⏵\uFE0E1", role: "img", ariaLabel: "Step" }),
      );
    }

    if (settings.stepBack) {
      this.stepBackButton = button(
        {
          disabled: true,
          classes: ["step-back"],
          onClick: async () => {
            if (restarting) return;

            try {
              this.endTweens();
              if (this.hasHistory()) {
                await this.popState({ animate: true });
                if (!this.hasHistory()) {
                  disable(this.stepBackButton);
                }
              }
            } catch (e) {
              console.error(e);
              this.setError(e as Error);
            }
          },
        },
        span({ text: "⏴\uFE0E1", role: "img", ariaLabel: "Step back" }),
      );
    }

    if (settings.speed) {
      this.speedSelector = select(
        {
          classes: ["speed"],
          onChange: () => {
            if (!this.speedSelector) return;
            this.speedMultiplier = Number.parseFloat(this.speedSelector.value);
          },
        },
        option({ text: "1x" }),
        option({ text: "2x" }),
        option({ text: "4x" }),
        option({ text: "8x" }),
        option({ text: "16x" }),
        option({ text: "32x" }),
      );
    }

    const enable = (button?: HTMLButtonElement) => {
      if (button) {
        button.disabled = false;
      }
    };

    const disable = (button?: HTMLButtonElement) => {
      if (button) {
        button.disabled = true;
      }
    };

    const hide = (button?: HTMLButtonElement) => {
      if (button) {
        button.style.display = "none";
      }
    };

    const show = (button?: HTMLButtonElement) => {
      if (button) {
        button.style.display = "block";
      }
    };

    this.on("start", () => {
      if (restarting) return;
      hide(this.playButton);
      show(this.pauseButton);
      disable(this.playButton);
      enable(this.pauseButton);
      disable(this.stepButton);
      disable(this.stepBackButton);
    });

    this.on("stop", () => {
      if (restarting) return;
      disable(this.playButton);
      disable(this.pauseButton);
      show(this.playButton);
      hide(this.pauseButton);
      disable(this.stepButton);
      disable(this.stepBackButton);
    });

    this.on("halt", () => {
      if (restarting) return;
      disable(this.playButton);
      disable(this.pauseButton);
      show(this.playButton);
      hide(this.pauseButton);
      disable(this.stepButton);
      if (this.hasHistory()) {
        enable(this.stepBackButton);
      } else {
        disable(this.stepBackButton);
      }
    });

    this.on("pause", () => {
      if (restarting) return;
      enable(this.playButton);
      disable(this.pauseButton);
      show(this.playButton);
      hide(this.pauseButton);
      enable(this.stepButton);

      if (this.hasHistory()) {
        enable(this.stepBackButton);
      }
    });

    this.on("restart", () => {
      if (this.isRunning()) {
        disable(this.playButton);
        enable(this.pauseButton);
        hide(this.playButton);
        show(this.pauseButton);
        disable(this.stepButton);
        disable(this.stepBackButton);
      } else {
        enable(this.playButton);
        disable(this.pauseButton);
        show(this.playButton);
        hide(this.pauseButton);
        enable(this.stepButton);

        if (this.hasHistory()) {
          enable(this.stepBackButton);
        } else {
          disable(this.stepBackButton);
        }
      }
    });

    this.on("step", () => {
      if (restarting) return;
      if (this.isRunning()) {
        return;
      }

      if (this.hasHistory()) {
        enable(this.stepBackButton);
      } else {
        disable(this.stepBackButton);
      }

      if (this._halted) {
        disable(this.playButton);
        disable(this.pauseButton);
        show(this.playButton);
        hide(this.pauseButton);
        disable(this.stepButton);
      } else {
        show(this.playButton);
        hide(this.pauseButton);
        enable(this.playButton);
        disable(this.pauseButton);
        enable(this.stepButton);
      }
    });

    this.on("restoreState", () => {
      if (restarting) return;
      if (this.isRunning()) {
        return;
      }

      if (this.hasHistory()) {
        enable(this.stepBackButton);
      } else {
        disable(this.stepBackButton);
      }

      if (this._halted) {
        show(this.playButton);
        hide(this.pauseButton);
        disable(this.playButton);
        disable(this.pauseButton);
        disable(this.stepButton);
      } else {
        show(this.playButton);
        hide(this.pauseButton);
        enable(this.playButton);
        disable(this.pauseButton);
        enable(this.stepButton);
      }
    });

    this.on("error", () => {
      show(this.playButton);
      hide(this.pauseButton);
      disable(this.playButton);
      disable(this.pauseButton);
      disable(this.stepButton);
    });

    const add = (element?: HTMLElement) => {
      if (element) {
        this.controlsElement.appendChild(element);
      }
    };

    add(this.restartButton);
    add(this.pauseButton);
    add(this.playButton);
    add(this.stepBackButton);
    add(this.stepButton);
    add(this.speedSelector);
  }

  centerScrollbar() {
    requestAnimationFrame(() => {
      this.svgContainer.scrollTo({
        left: this.two.width / 2 - this.clientWidth / 2,
        behavior: "instant",
      });
    });
  }

  applySticky() {
    if (this.clientHeight > 0 && this.clientHeight > window.innerHeight) {
      this.container.classList.add("sticky");
    } else {
      this.container.classList.remove("sticky");
    }
  }

  buildProgramElement(program: Program): HTMLElement {
    const rows: HTMLTableRowElement[] = [];

    const bs = branches(program, { sortKeys: ["label", "read"] });
    let currentLabel: string | undefined = undefined;
    let currentRead: string | undefined = undefined;
    let lastLabel: HTMLTableCellElement | undefined = undefined;
    let lastRead: HTMLTableCellElement | undefined = undefined;
    for (const { label, read, instructions, index } of bs) {
      const tds: HTMLTableCellElement[] = [];
      if (label !== currentLabel) {
        const labelDiv = div({
          id: this.stateId(label),
          classes: ["instruction"],
          text: label,
        });
        labelDiv.setAttribute(this.dataReadId(read), "1");
        const labelTd = td({ rowspan: 1 }, labelDiv);
        lastLabel = labelTd;
        tds.push(labelTd);
      } else {
        lastLabel!
          .querySelector("div.instruction")!
          .setAttribute(this.dataReadId(read), "1");
        lastLabel!.rowSpan++;
      }
      currentLabel = label;

      if (read !== currentRead) {
        const readDiv = div({
          id: this.readId(read),
          classes: ["instruction"],
          text: read || "␣",
        });
        readDiv.setAttribute(`data-label-${label}`, "1");
        const readTd = td({ rowspan: 1 }, readDiv);
        lastRead = readTd;
        tds.push(readTd);
      } else {
        lastRead!
          .querySelector("div.instruction")!
          .setAttribute(`data-label-${currentLabel}`, "1");
        lastRead!.rowSpan++;
      }
      currentRead = read;

      rows.push(
        tr(
          { id: this.lineId(index) },
          ...tds,
          td(
            {},
            div(
              { classes: ["instruction-container"] },
              ...instructions.map(this.buildInstructionElement, this),
            ),
          ),
        ),
      );
    }

    return table(
      {
        headers: [
          td({ text: "State" }),
          td({ text: "Value" }),
          td({ text: "Instructions" }),
        ],
      },
      ...rows,
    );
  }

  buildInstructionElement(instruction: Instruction) {
    return span({
      id: this.instructionId(instruction),
      classes: ["instruction", instruction.type],
      text: Compiler.instruction2pretty(instruction),
    });
  }

  getNextInstruction(): Instruction | undefined {
    if (!this.program || !this.state) {
      throw new Error("No program loaded");
    }

    if (!this.instruction) {
      const branch = this.program[this.state!];
      if (!branch) {
        throw new Error(`No branch for: ${this.state}`);
      }
      const value = this.tape.read();
      let instructions = branch[value]?.instructions;
      if (!instructions) {
        instructions = branch["*"]?.instructions;
      }
      return instructions?.[0];
    }

    if (this.instruction.type === "halt") {
      return undefined;
    }

    const { type, branch, index } = this.instruction;
    if (type === "goto") {
      const nextBranch = this.program[this.instruction.label];
      if (!nextBranch) {
        throw new Error(`state not found: "${this.instruction.label}"`);
      }

      const value = this.tape.read();
      let instructions = nextBranch[value]?.instructions;
      if (!instructions) {
        instructions = nextBranch["*"]?.instructions;
      }
      if (!instructions || instructions.length === 0) {
        throw new Error(
          `failed to find state|value pair, state: "${this.instruction.label}", value: "${value}"`,
        );
      }

      return instructions[0]!;
    }

    const nextIndex = index + 1;
    const instruction = branch.instructions[nextIndex];
    if (!instruction) {
      throw new Error(
        `failed to find state|value pair, state: "${branch.label}" value: "${index}"`,
      );
    }
    return instruction;
  }

  async moveInstructionPointer(
    target: HTMLElement | DOMRect,
    opts?: { animate?: boolean },
  ) {
    if (!this.instructionPointer) {
      throw new Error("No instruction pointer");
    }

    if (this.instructionPointerTween?.isPlaying()) {
      this.instructionPointerTween?.end();
    }

    const tween = this.movePointer(this.instructionPointer, target, opts);
    if (!tween) {
      return;
    }

    this.instructionPointerTween = tween;
    await Tweens.play(tween);
  }

  async moveStatePointer(
    target: HTMLElement | DOMRect,
    opts?: { animate?: boolean },
  ) {
    if (!this.statePointer) {
      throw new Error("No state pointer");
    }

    if (this.statePointerTween?.isPlaying()) {
      this.statePointerTween?.end();
    }

    const tween = this.movePointer(this.statePointer, target, opts);
    if (!tween) {
      return;
    }

    this.statePointerTween = tween;
    await Tweens.play(tween);
  }

  async moveValuePointer(
    target: HTMLElement | DOMRect,
    opts?: { animate?: boolean },
  ) {
    if (!this.valuePointer) {
      throw new Error("No value pointer");
    }

    if (this.valuePointerTween?.isPlaying()) {
      this.valuePointerTween?.end();
    }

    const tween = this.movePointer(this.valuePointer, target, opts);
    if (!tween) {
      return;
    }

    this.valuePointerTween = tween;
    await Tweens.play(tween);
  }

  movePointer(
    pointer: HTMLElement,
    target: HTMLElement | DOMRect,
    opts?: { animate?: boolean },
  ): Tween | undefined {
    const { animate = true } = opts ?? {};

    if (!target) {
      throw new Error("No target");
    }

    const originBox = pointer.getBoundingClientRect();
    const tableBox = this.programElement.getBoundingClientRect();
    const targetBox = "top" in target ? target : target.getBoundingClientRect();

    const values: {
      top: number;
      left: number;
      width: number;
      height: number;
    } = {
      top: pointer.offsetTop,
      left: pointer.offsetLeft,
      width: pointer.offsetWidth,
      height: pointer.offsetHeight,
    };

    if (!animate) {
      pointer.style.top = `${targetBox.top - tableBox.top}px`;
      pointer.style.left = `${targetBox.left - tableBox.left}px`;
      pointer.style.width = `${targetBox.width}px`;
      pointer.style.height = `${targetBox.height}px`;
      return undefined;
    }

    if (
      roughlyEqual(originBox.top, targetBox.top) &&
      roughlyEqual(originBox.left, targetBox.left) &&
      roughlyEqual(originBox.width, targetBox.width) &&
      roughlyEqual(originBox.height, targetBox.height)
    ) {
      return;
    }

    return new Tween(values)
      .to(
        {
          top: targetBox.top - tableBox.top,
          left: targetBox.left - tableBox.left,
          width: targetBox.width,
          height: targetBox.height,
        },
        this.stepDuration,
      )
      .onUpdate((e) => {
        pointer.style.top = `${e.top}px`;
        pointer.style.left = `${e.left}px`;
        pointer.style.width = `${e.width}px`;
        pointer.style.height = `${e.height}px`;
      })
      .easing(Easing.Exponential.Out);
  }

  async resetPointers(opts?: { animate?: boolean }) {
    if (Object.keys(this.program || {}).length === 0) {
      return;
    }

    const value = this.tape.read();
    const stateElement = this.getStateElement(this.state!, value);
    const readElement = this.getReadElement(this.state!, value);
    const instructionElement = document.getElementById(
      this.instructionId(this.instruction!),
    );

    if (!instructionElement) {
      return;
    }

    const operations: Promise<void>[] = [];
    if (stateElement) {
      operations.push(this.moveStatePointer(stateElement, opts));
    }

    if (readElement) {
      operations.push(this.moveValuePointer(readElement, opts));
    }

    operations.push(this.moveInstructionPointer(instructionElement, opts));

    console.log("resetPointers", operations.length);
    await Promise.all(operations);
  }

  isStepping(): boolean {
    return this._stepping;
  }

  stepFinished(): Promise<void> {
    return new Promise((resolve) => {
      this._stepFinishedCallbacks.push(resolve);
    });
  }

  async step(opts?: { interactive?: boolean }): Promise<boolean> {
    if (this._stepping) {
      throw new Error("Already stepping");
    }

    this._stepping = true;

    this._endTweensCalled = false;
    try {
      const { interactive = false } = opts ?? {};

      if (!this.program || !this.instruction) {
        return true;
      }

      this._halted = false;
      this.pushState();

      this.dispatch("step", {});

      const shouldAnimate = () => {
        if (this._endTweensCalled) return false;
        if (interactive) return true;
        return !this._pause;
      };

      let operations: Promise<void>[] = [];
      let written: string | undefined = undefined;
      switch (this.instruction.type) {
        case "left":
          operations.push(this.tape.left({ animate: shouldAnimate() }));
          break;
        case "right":
          operations.push(this.tape.right({ animate: shouldAnimate() }));
          break;
        case "print":
          written = this.instruction.value;
          operations.push(
            this.tape.print(this.instruction.value, {
              animate: shouldAnimate(),
            }),
          );
          break;
        case "halt":
          this._halted = true;
          this.dispatch("halt", {});
          return true;
        case "goto":
          if (!this.program[this.instruction.label]) {
            throw new Error(`state not found: "${this.instruction.label}"`);
          }
          this.state = this.instruction.label;
          if (this.showProgram) {
            const value = this.tape.read();
            const stateElement = this.getStateElement(this.state!, value);
            operations.push(
              this.moveStatePointer(stateElement, {
                animate: shouldAnimate(),
              }),
            );
          }

          break;
        default:
          throw new Error(`Invalid instruction: ${this.instruction}`);
      }

      if (this.showProgram) {
        const newValue = written || this.tape.read();
        const readElement = this.getReadElement(this.state!, newValue);

        if (readElement) {
          operations.push(
            this.moveValuePointer(readElement, { animate: shouldAnimate() }),
          );
        }
      }

      this.instruction = this.getNextInstruction();
      this.firstInstruction = false;

      const instructionElement = document.getElementById(
        this.instructionId(this.instruction!),
      );

      if (this.showProgram) {
        if (!instructionElement) {
          return true;
        }
        if (interactive) {
          operations.push(
            this.moveInstructionPointer(instructionElement, {
              animate: shouldAnimate(),
            }),
          );
        } else {
          await Promise.all(operations);
          operations = [
            this.moveInstructionPointer(instructionElement, {
              animate: shouldAnimate(),
            }),
          ];
        }
      }

      await Promise.all(operations);
      return false;
    } catch (e) {
      console.error(e);
      this.setError(e as Error);
      return true;
    } finally {
      this._stepping = false;
      while (true) {
        const f = this._stepFinishedCallbacks.shift();
        if (!f) break;
        const result = f();
        if (result instanceof Promise) {
          await result;
        }
      }
    }
  }

  private getInstructionById(id: string): Instruction | undefined {
    if (!this.program) {
      return;
    }

    for (const branches of Object.values(this.program)) {
      for (const branch of Object.values(branches)) {
        for (const instruction of branch.instructions) {
          if (instruction.id === id) {
            return instruction;
          }
        }
      }
    }
    return;
  }

  private getFullState(): State {
    const tape = this.tape.readFullTape();
    const tapeIndex = this.tape.currentSquareIndex;

    if (!this.state) {
      throw new Error("No state");
    }

    if (!this.instruction) {
      throw new Error("No instruction");
    }

    return {
      state: this.state,
      tape,
      tapeIndex,
      instructionId: this.instruction.id,
      halted: this._halted,
    };
  }

  private pushState() {
    const state = this.getFullState();
    this._history.push(state);
    if (this._history.length > 30) {
      this._history.shift();
    }
  }

  private hasHistory(): boolean {
    return this._history.length > 0;
  }

  private async popState(opts?: { animate?: boolean }) {
    const state = this._history.pop();
    if (state) {
      await this.restoreState(state, opts);
    }
  }

  private async restoreState(state: State, opts?: { animate?: boolean }) {
    if (state.instructionId) {
      this.instruction = this.getInstructionById(state.instructionId!);
    } else {
      this.instruction = undefined;
    }

    this.tape.setValue(state.tape.symbols, {
      minIndex: state.tape.minIndex,
      maxIndex: state.tape.maxIndex,
    });

    this._halted = state.halted;

    this.dispatch("restoreState", {});

    await Promise.all([
      this.tape.setHeadIndex(state.tapeIndex, opts),
      this.resetPointers(opts),
    ]);
  }

  private stateId(state: string): string {
    return `${this.id}-state-${state}`;
  }

  private instructionId(instruction: Instruction): string {
    return `${this.id}-instruction-${instruction.id}`;
  }

  private lineId(index: number): string {
    return `${this.id}-line-${index}`;
  }

  private readId(read: string): string {
    if (read === "*") {
      return `${this.id}-read-star`;
    }
    if (read === "") {
      return `${this.id}-read-blank`;
    }
    return `${this.id}-read-${read}`;
  }

  private dataReadId(read: string): string {
    if (read === "*") {
      return "data-read-star";
    }
    if (read === "") {
      return "data-read-blank";
    }
    return `data-read-${read}`;
  }

  private getReadElement(state: string, read: string): HTMLElement {
    let el = this.querySelector(
      `#${this.readId(read)}[data-label-${state}="1"]`,
    );
    if (el) return el as HTMLElement;

    el = this.querySelector(`#${this.readId("*")}[data-label-${state}="1"]`);
    if (el) return el as HTMLElement;

    return document.getElementById(this.readId(read))!;
  }

  private getStateElement(state: string, read: string): HTMLElement {
    const el = this.querySelector(
      `#${this.stateId(state)}[${this.dataReadId(this.tape.read())}="1"]`,
    );
    if (el) {
      return el as HTMLElement;
    }
    return document.getElementById(this.stateId(state))!;
  }

  isPaused(): boolean {
    return this._pause;
  }

  isRunning(): boolean {
    return this._running;
  }

  async pause() {
    this.endTweens();
    if (this._pause || !this._running) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.once("stop", () => {
        this.dispatch("pause", {});
        resolve();
      });
      this._pause = true;
    });
  }

  resume() {
    if (!this._pause || this._running) {
      return;
    }
    this.run();
  }

  endTweens() {
    this._endTweensCalled = true;
    this.instructionPointerTween?.end();
    this.valuePointerTween?.end();
    this.statePointerTween?.end();
    this.instructionPointerTween = undefined;
    this.valuePointerTween = undefined;
    this.statePointerTween = undefined;
    this.tape.endTweens();
  }

  async restart(opts?: { animate?: boolean; paused?: boolean }) {
    this.clearError();
    await this.pause();

    const input = this.getAttribute("input") || "";
    this.tape.setValue(input.split(""));

    const programElement = this.querySelector("program") as HTMLElement | null;
    if (programElement) {
      this.showProgram =
        (programElement.getAttribute("show") ?? "true") === "true";
      const program = Compiler.text2program(programElement.textContent ?? "");
      const entrypoint = programElement.getAttribute("entrypoint") ?? "main";

      this.load(this.program || program, entrypoint);

      if (this.program && Object.keys(this.program).length > 0) {
        await this.resetPointers(opts);

        if (!this._readerPressedPause && !this._halted && !opts?.paused) {
          this.run();
        }
      }
    }

    this.dispatch("restart", {});
  }

  load(program: Program, entrypoint: string) {
    this.clearError();
    this._history = [];

    if (Object.keys(program).length === 0) {
      this.program = {};
      this.state = undefined;
      this.endTweens();
      this.programElement.remove();
      return;
    }

    if (this.showProgram) {
      for (const child of this.programElement.childNodes) {
        child.remove();
      }
      if (!this.contains(this.programElement)) {
        this.appendChild(this.programElement);
      }
      const table = this.buildProgramElement(program);
      this.programElement.appendChild(table);
      table.prepend(this.valuePointer);
      table.prepend(this.statePointer);
      table.prepend(this.instructionPointer);
    } else {
      this.programElement.remove();
    }

    this.program = program;
    this.state = entrypoint;

    if (!(this.state in this.program)) {
      const e = new Error(`state not found: "${entrypoint}"`);
      this.setError(e);
      throw e;
    }

    const read = this.tape.read();

    this.instruction = undefined;
    this.instruction = this.getNextInstruction();
    if (!this.instruction) {
      const e = new Error(
        `couldn't find state|value pair, state: "${entrypoint}" value: "${read}"`,
      );
      this.setError(e);
      throw e;
    }

    this.firstInstruction = true;
  }

  async run() {
    if (this._running) {
      return;
    }
    this.clearError();
    this._running = true;
    this._pause = false;
    this._readerPressedPause = false;
    this._halted = false;
    this.dispatch("start", {});
    while (true) {
      if (this._pause) {
        break;
      }

      const shouldStop = await this.step();
      if (shouldStop) {
        break;
      }
    }
    this._running = false;
    this.dispatch("stop", {});
  }
}

interface TapeOpts {
  squareSize: number;
  containerWidth: number;
  gui?: GUI;
  stepDuration: number;
  showHead: boolean;
}

class Tape extends Group {
  containerWidth: number;
  squareSize: number;
  squares = new Map<number, Square>();
  currentSquareIndex: number;
  head?: Head;

  moveTween?: Tween;

  amplitude = 1;
  period = 0.65;

  _stepDuration: number;
  _speedMultiplier = 1;

  _minIndex = 0;
  _maxIndex = 0;

  gui?: GUI;

  private squareGroup: Group;

  get stepDuration(): number {
    return (
      this._stepDuration / window.globalSpeedMultiplier / this._speedMultiplier
    );
  }

  set stepDuration(value: number) {
    this._stepDuration = value;
    if (this.head) {
      this.head.stepDuration = value;
    }
  }

  set speedMultiplier(value: number) {
    this._speedMultiplier = value;
    if (this.head) {
      this.head.speedMultiplier = value;
    }
  }

  constructor(opts: TapeOpts) {
    super();

    this.noStroke();
    this.noFill();

    this.stepDuration = opts.stepDuration;
    this.squareSize = opts.squareSize;
    this.containerWidth = opts.containerWidth;

    this.gui = opts.gui?.addFolder("Tape");
    this.gui?.add(this, "amplitude", 0, 10);
    this.gui?.add(this, "period", 0, 10);

    this.squareGroup = new Group();
    for (let i = -this.squaresEitherSide; i <= this.squaresEitherSide; i++) {
      this.squareGroup.children.push(this.getSquare(i));
    }

    this.currentSquareIndex = 0;

    this.add(this.squareGroup);

    if (opts.showHead) {
      this.head = new Head({
        size: this.squareSize,
        gui: this.gui,
        stepDuration: this.stepDuration,
      });
      this.head.position.set(
        this.currentSquare.position.x,
        this.currentSquare.position.y,
      );
      this.add(this.head);
    }
  }

  clear() {
    for (const square of this.squares.values()) {
      square.symbol = "";
    }
  }

  readFullTape(): { minIndex: number; maxIndex: number; symbols: string[] } {
    return {
      minIndex: this._minIndex,
      maxIndex: this._maxIndex,
      symbols: Array.from(
        { length: this._maxIndex - this._minIndex + 1 },
        (_, i) => this.getSquare(this._minIndex + i).symbol,
      ),
    };
  }

  setValue(input: string[], opts?: { minIndex?: number; maxIndex?: number }) {
    this.clear();
    const min = opts?.minIndex ?? this.currentSquareIndex;
    const max = opts?.maxIndex ?? this.currentSquareIndex + input.length - 1;
    for (let i = min; i <= max; i++) {
      this.getSquare(i).symbol = input[i - min]!.trim();
    }
    this._minIndex = min;
    this._maxIndex = max;
  }

  async setHeadIndex(index: number, opts?: { animate?: boolean }) {
    if (!this.head) {
      return;
    }

    while (true) {
      if (this.currentSquareIndex === index) {
        break;
      }
      if (this.currentSquareIndex < index) {
        await this.right(opts);
      }
      if (this.currentSquareIndex > index) {
        await this.left(opts);
      }
    }
  }

  get squaresEitherSide(): number {
    return 20;
  }

  getSquare(i: number): Square {
    if (i < this._minIndex) {
      this._minIndex = i;
    }
    if (i > this._maxIndex) {
      this._maxIndex = i;
    }

    let square = this.squares.get(i);
    if (square === undefined) {
      square = new Square(i * this.squareSize, 0, this.squareSize, "");
      this.squares.set(i, square);
    }
    return square;
  }

  async right(opts?: { animate?: boolean }) {
    this.endTweens();
    this.currentSquareIndex++;
    await this.moveTape(opts);
  }

  async left(opts?: { animate?: boolean }) {
    this.endTweens();
    this.currentSquareIndex--;
    await this.moveTape(opts);
  }

  endTweens() {
    if (this.moveTween?.isPlaying()) {
      this.moveTween?.end();
    }
    this.moveTween = undefined;
    this.head?.endTweens();
  }

  private async moveTape(opts?: { animate?: boolean }) {
    const { animate = true } = opts ?? {};
    const newX = -(this.currentSquareIndex * this.squareSize);

    let add: Square;
    let remove: Square;
    if (newX < this.squareGroup.position.x) {
      // right
      remove = this.getSquare(
        this.currentSquareIndex - this.squaresEitherSide - 1,
      );
      add = this.getSquare(this.currentSquareIndex + this.squaresEitherSide);
    } else {
      // left
      add = this.getSquare(this.currentSquareIndex - this.squaresEitherSide);
      remove = this.getSquare(
        this.currentSquareIndex + this.squaresEitherSide + 1,
      );
    }

    this.squareGroup.remove(remove);
    this.squareGroup.add(add);

    if (this.moveTween?.isPlaying()) {
      this.moveTween?.end();
    }
    this.moveTween = undefined;

    if (!animate) {
      this.squareGroup.position.x = newX;
      return;
    }

    if (hasRequestedReducedMotion()) {
      this.moveTween = new Tween(this.squareGroup.position).to(
        { x: newX },
        this.stepDuration / 2,
      );
    } else {
      this.moveTween = new Tween(this.squareGroup.position)
        .easing(
          elastic.out.with({
            amplitude: this.amplitude,
            period: this.period,
          }),
        )
        .to({ x: newX }, this.stepDuration);
    }

    await Tweens.play(this.moveTween);
  }

  read(): string {
    return this.currentSquare.symbol;
  }

  async print(symbol: string, opts?: { animate?: boolean }) {
    if (this.head) {
      await this.head.stamp(() => {
        this.currentSquare.symbol = symbol;
      }, opts);
    } else {
      this.currentSquare.symbol = symbol;
      await sleep(this.stepDuration);
    }
  }

  private get currentSquare() {
    return this.getSquare(this.currentSquareIndex);
  }
}

class Square extends Group {
  rect: Rectangle;
  text: Text;

  constructor(x: number, y: number, size: number, symbol?: string) {
    super();
    this.noFill();

    this.stroke = "black";
    this.linewidth = 1;

    this.position.set(x, y);

    this.rect = new Rectangle(0, 0, size, size);
    this.add(this.rect);

    this.text = new Text(symbol ?? " ", 0, 0, { size: Math.floor(size / 2) });
    this.add(this.text);
  }

  set size(value: number) {
    this.rect.width = value;
    this.rect.height = value;
    this.text.size = Math.floor(value / 2);
  }

  set symbol(value: string) {
    this.text.value = value;
  }

  get symbol() {
    return this.text.value;
  }
}

interface HeadOpts {
  size: number;
  stepDuration: number;
  gui?: GUI;
}

class Head extends Group {
  _border: Rectangle;
  _background: Rectangle;
  _stamp: Rectangle;
  _stampTween?: Tween;
  _tweensCanceled = false;
  _stepDuration: number;
  _speedMultiplier = 1;
  size: number;
  gui?: GUI;

  get stepDuration(): number {
    return (
      this._stepDuration / window.globalSpeedMultiplier / this._speedMultiplier
    );
  }

  set stepDuration(value: number) {
    this._stepDuration = value;
  }

  set speedMultiplier(value: number) {
    this._speedMultiplier = value;
  }

  constructor(opts: HeadOpts) {
    super();
    this.noFill();
    this.noStroke();

    this.size = opts.size;

    this._stepDuration = opts.stepDuration;

    const stroke = Math.ceil(this.size / 15);
    this._border = new Rectangle(0, 0, this.size - stroke, this.size - stroke);
    this._border.stroke = HEAD.hex();
    this._border.linewidth = stroke;
    this._border.noFill();
    this.add(this._border);

    this._background = new Rectangle(0, 0, this.size, this.size);
    this._background.noStroke();
    this._background.fill = HEAD.hex();
    this._background.opacity = 0.2;
    this.add(this._background);

    this._stamp = new Rectangle(0, 0, this.size, 0);
    this._stamp.noStroke();
    this._stamp.fill = HEAD.hex();
    this._stamp.origin = new Two.Vector(0, this.size / 2);
    this.add(this._stamp);

    this.gui = opts.gui?.addFolder("Head");
    this.gui?.add(this._border, "linewidth", 1, 10, 1);
  }

  endTweens() {
    this._tweensCanceled = true;
    if (this._stampTween?.isPlaying()) {
      this._stampTween.end();
    }
    this._stampTween = undefined;
  }

  async stamp(f: () => void, opts?: { animate?: boolean }): Promise<void> {
    const { animate = true } = opts ?? {};

    if (this._stampTween?.isPlaying()) {
      this._stampTween.end();
    }
    this._stampTween = undefined;

    if (!animate) {
      f();
      return;
    }

    this._tweensCanceled = false;
    if (hasRequestedReducedMotion()) {
      this._stamp.height = this.size * 2;
      f();
      await sleep(this.stepDuration / 4);
      this._stamp.height = 0;
    } else {
      this._stampTween = new Tween(this._stamp).to(
        {
          height: this.size * 2,
        },
        this.stepDuration / 8,
      );
      await Tweens.play(this._stampTween);
      f();
      if (this._tweensCanceled) {
        this._tweensCanceled = false;
        if (this._stampTween?.isPlaying()) {
          this._stampTween.end();
        }
        this._stampTween = undefined;
        this._stamp.height = 0;
        return;
      }
      this._stampTween = new Tween(this._stamp)
        .to({ height: 0 }, this.stepDuration / 2)
        .easing(Easing.Exponential.Out);
      await Tweens.play(this._stampTween);
    }
  }
}
