import { BaseElement } from "../core/BaseElement";
import { button, div, select, option } from "../core/DOM";
import { SVG } from "../core/SVG";
import { wait } from "../core/Utils";
import { Debugger } from "./Debugger";

export class DebuggerControls extends BaseElement {
  static defaultStepDelay = 1000;

  private debugger!: Debugger;
  private resetButton!: HTMLButtonElement;
  private playPauseButton!: HTMLButtonElement;
  private stepButton!: HTMLButtonElement;
  private stepBackButton!: HTMLButtonElement;
  private speedSelect!: HTMLSelectElement;
  private playSpeed = DebuggerControls.defaultStepDelay;
  private timeout?: ReturnType<typeof setTimeout>;

  init() {
    const debuggerId = this.getAttribute("debugger-id");
    if (!debuggerId) {
      throw new Error("DebuggerControls requires 'debugger-id' attribute");
    }

    const debuggerElement = document.getElementById(
      debuggerId
    ) as Debugger | null;
    if (!debuggerElement) {
      throw new Error(`Debugger with id '${debuggerId}' not found`);
    }
    this.debugger = debuggerElement;

    this.classList.add("controls");

    this.speedSelect = select(
      { class: "speed-select", name: "speed", ariaLabel: "Play speed" },
      option({ value: "0.2" }, ".2x"),
      option({ value: "0.5" }, ".5x"),
      option({ value: "1", selected: true }, "1x"),
      option({ value: "2" }, "2x"),
      option({ value: "4" }, "4x"),
      option({ value: "8" }, "8x")
    );

    this.resetButton = button(
      {
        class: ["control-button", "reset"],
        ariaLabel: "Reset",
        disabled: true,
      },
      SVG.restart()
    );
    this.playPauseButton = button(
      { class: ["control-button", "continue"], ariaLabel: "Play" },
      SVG.play()
    );
    this.stepButton = button(
      { class: ["control-button", "step"], ariaLabel: "Step forward" },
      SVG.skipForward()
    );
    this.stepBackButton = button(
      {
        class: ["control-button", "step-back"],
        ariaLabel: "Step back",
        disabled: true,
      },
      SVG.skipBack()
    );

    const controlsLeft = div(
      { class: "controls-left" },
      this.resetButton,
      this.speedSelect,
      this.playPauseButton
    );

    const controlsRight = div(
      { class: "controls-right" },
      this.stepBackButton,
      this.stepButton
    );

    this.replaceChildren(controlsLeft, controlsRight);

    this.debugger.onReachedEnd(() => {
      this.resetButton.disabled = false;
      this.stepButton.disabled = true;
      this.stepBackButton.disabled = false;
      this.playPauseButton.disabled = true;
      this.playPauseButton.replaceChildren(SVG.play());
    });

    this.debugger.onReachedStart(() => {
      this.resetButton.disabled = true;
      this.stepButton.disabled = false;
      this.stepBackButton.disabled = true;
      this.playPauseButton.disabled = false;
    });

    this.debugger.onRestart(() => {
      this.resetButton.disabled = true;
      this.stepButton.disabled = false;
      this.stepBackButton.disabled = true;
      this.playPauseButton.disabled = false;
    });

    this.resetButton.addEventListener("click", () => {
      clearTimeout(this.timeout);
      this.timeout = undefined;
      this.debugger.restart();
      this.playPauseButton.replaceChildren(SVG.play());
    });

    this.playPauseButton.addEventListener("click", async () => {
      if (this.timeout) {
        this.pause();
      } else {
        this.play();
      }
    });

    this.stepButton.addEventListener("click", () => {
      this.resetButton.disabled = false;
      this.stepBackButton.disabled = false;
      this.playPauseButton.disabled = false;

      this.debugger.step();
    });

    this.stepBackButton.addEventListener("click", () => {
      this.resetButton.disabled = false;
      this.stepButton.disabled = false;
      this.playPauseButton.disabled = false;

      this.debugger.stepBack();
    });

    this.speedSelect.addEventListener("change", () => {
      this.playSpeed =
        DebuggerControls.defaultStepDelay / parseFloat(this.speedSelect.value);
    });
  }

  play() {
    if (this.timeout) return;

    this.resetButton.disabled = true;
    this.stepButton.disabled = true;
    this.stepBackButton.disabled = true;

    this.playPauseButton.replaceChildren(SVG.pause());

    const f = () => {
      if (!this.debugger.step()) {
        this.timeout = undefined;
        return;
      }
      this.timeout = setTimeout(f, this.playSpeed);
    };

    this.timeout = setTimeout(f, 0);
  }

  pause() {
    if (!this.timeout) return;

    this.resetButton.disabled = false;
    this.stepButton.disabled = false;
    this.stepBackButton.disabled = false;

    this.playPauseButton.replaceChildren(SVG.play());

    clearTimeout(this.timeout);
    this.timeout = undefined;
  }
}
