import { BaseElement } from "../core/BaseElement";
import { div, button, select, option } from "../core/DOM";
import { SVG } from "../core/SVG";
import { startViewTransition } from "../core/Utils";

interface SwapStep {
  array: number[];
  compareIndices?: [number, number];
  swapIndices?: [number, number];
}

export class BubbleSortViewer extends BaseElement {
  private steps: SwapStep[] = [];
  private currentStep = 0;
  private grid!: HTMLDivElement;

  // Control elements
  private resetButton!: HTMLButtonElement;
  private playPauseButton!: HTMLButtonElement;
  private stepButton!: HTMLButtonElement;
  private stepBackButton!: HTMLButtonElement;
  private speedSelect!: HTMLSelectElement;

  // Animation state
  private playSpeed = 1000;
  private timeout?: ReturnType<typeof setTimeout>;
  private isPlaying = false;

  private readonly COLORS = [
    "var(--palette-orange)",
    "var(--palette-green)",
    "var(--palette-dark-blue)",
    "var(--palette-red)",
    "var(--palette-pink)",
  ];

  init() {
    const initialArray = [3, 2, 5, 4, 1];
    this.generateBubbleSortSteps(initialArray);

    this.createLayout();
    this.setupControls();
    this.updateDisplay();
  }

  private generateBubbleSortSteps(arr: number[]) {
    this.steps = [];
    const array = [...arr];
    const n = array.length;

    this.steps.push({
      array: [...array],
    });

    while (true) {
      let swapped = false;
      for (let j = 0; j < n - 1; j++) {
        this.steps.push({
          array: [...array],
          compareIndices: [j, j + 1],
        });

        if (array[j]! > array[j + 1]!) {
          [array[j]!, array[j + 1]!] = [array[j + 1]!, array[j]!];
          this.steps.push({
            array: [...array],
            swapIndices: [j, j + 1],
          });
          swapped = true;
        }
      }
      if (!swapped) break;
    }

    this.steps.push({
      array: [...array],
    });
  }

  private createLayout() {
    this.grid = div({ class: "bubble-sort-grid" });

    // Create controls
    this.speedSelect = select(
      { class: "speed-select", name: "speed" },
      option({ value: "0.25" }, ".2x"),
      option({ value: "0.5" }, ".5x"),
      option({ value: "1", selected: true }, "1x"),
      option({ value: "2" }, "2x"),
      option({ value: "4" }, "4x")
    );

    this.resetButton = button(
      { class: ["control-button", "reset"], disabled: true },
      SVG.restart()
    );

    this.playPauseButton = button(
      { class: ["control-button", "play-pause"] },
      SVG.play()
    );

    this.stepButton = button(
      { class: ["control-button", "step"] },
      SVG.skipForward()
    );

    this.stepBackButton = button(
      { class: ["control-button", "step-back"], disabled: true },
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

    const controls = div({ class: "controls" }, controlsLeft, controlsRight);

    this.replaceChildren(this.grid, controls);
  }

  private setupControls() {
    this.resetButton.addEventListener("click", () => {
      this.pause();
      this.currentStep = 0;
      this.updateDisplay();
      this.updateButtons();
    });

    this.playPauseButton.addEventListener("click", () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });

    this.stepButton.addEventListener("click", () => {
      this.pause();
      this.stepForward();
    });

    this.stepBackButton.addEventListener("click", () => {
      this.pause();
      this.stepBackward();
    });

    this.speedSelect.addEventListener("change", () => {
      this.playSpeed = 1000 / parseFloat(this.speedSelect.value);
    });
  }

  private stepForward() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.updateDisplay();
      this.updateButtons();
    }
  }

  private stepBackward() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateDisplay();
      this.updateButtons();
    }
  }

  private play() {
    if (this.currentStep >= this.steps.length - 1) {
      return;
    }

    this.isPlaying = true;
    this.playPauseButton.replaceChildren(SVG.pause());
    this.updateButtons();

    const step = () => {
      this.stepForward();
      if (this.currentStep < this.steps.length - 1) {
        this.timeout = setTimeout(step, this.playSpeed);
      } else {
        this.pause();
      }
    };

    this.timeout = setTimeout(step, 0);
  }

  private pause() {
    this.isPlaying = false;
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
    this.playPauseButton.replaceChildren(SVG.play());
    this.updateButtons();
  }

  private updateButtons() {
    const atStart = this.currentStep === 0;
    const atEnd = this.currentStep === this.steps.length - 1;

    this.resetButton.disabled = atStart;
    this.stepBackButton.disabled = atStart || this.isPlaying;
    this.stepButton.disabled = atEnd || this.isPlaying;
    this.playPauseButton.disabled = atEnd;
  }

  private async updateDisplay() {
    await startViewTransition(() => {
      const currentStepData = this.steps[this.currentStep];
      if (!currentStepData) return;

      // Clear existing items
      this.grid.replaceChildren();

      // Create array items
      currentStepData.array.forEach((value, index) => {
        const itemDiv = div(
          {
            class: "item",
            data: { index: index.toString() },
            style: {
              viewTransitionName: `bubble-sort-${value}`,
            },
          },
          String(value)
        );

        // Apply color based on numeric value (1-5)
        if (value >= 1 && value <= 5) {
          const colorIndex = (value - 1) % this.COLORS.length;
          itemDiv.style.backgroundColor = this.COLORS[colorIndex]!;
          itemDiv.style.color = "white";
          itemDiv.style.fontWeight = "bold";
        } else {
          itemDiv.style.color = "white";
          itemDiv.style.fontWeight = "bold";
        }

        // Highlight compared elements
        if (currentStepData.compareIndices?.includes(index)) {
          itemDiv.classList.add("comparing");
        }

        // Highlight swapped elements
        if (currentStepData.swapIndices?.includes(index)) {
          itemDiv.classList.add("swapping");
        }

        this.grid.appendChild(itemDiv);
      });
    });
  }
}
