import { BaseElement } from "../core/BaseElement";
import { button, div, span } from "../core/DOM";
import { exec } from "../core/CodeWorker";
import { SVG } from "../core/SVG";

function formatValue(value: number): string {
  const seconds = value / 1000;
  return `${seconds.toFixed(1)}s`;
}

class Bar {
  static nextId = 1;

  id: string;
  element: HTMLElement;
  label: string;
  isRunning: boolean;
  private button: HTMLButtonElement;
  private code: string;
  private startTime?: number = undefined;
  private lastExecutionTime = 0;

  constructor(label: string, code: string) {
    this.id = `bar-${Bar.nextId++}`;
    this.label = label;
    this.code = code;
    this.isRunning = false;

    this.button = button({ class: "run-button" }, SVG.play(), label);
    this.element = div(
      ".bar-container",
      div(
        ".bar-value-container",
        div({ class: "bar-value", role: "timer", ariaAtomic: "true" })
      ),
      this.button
    );
  }

  onClick(f: () => void) {
    this.button.addEventListener("click", f);
  }

  get valueElement(): HTMLElement {
    return this.element.querySelector(".bar-value") as HTMLElement;
  }

  disable() {
    this.button.disabled = true;
  }

  enable() {
    this.button.disabled = false;
  }

  async run() {
    if (this.isRunning) {
      throw new Error(`Bar ${this.id} is already running`);
    }

    this.button.replaceChildren(SVG.spinner());
    this.isRunning = true;

    return new Promise<void>((resolve, reject) => {
      exec({
        code: this.code,
        onStart: () => {
          this.startTime = performance.now();
          this.element.classList.add("active");
        },
        onComplete: () => {
          this.lastExecutionTime = performance.now() - this.startTime!;
          this.startTime = undefined;
          this.isRunning = false;

          this.element.classList.remove("active");
          this.button.replaceChildren(SVG.play(), this.label);
          resolve();
        },
        onError: (error) => {
          this.startTime = undefined;
          this.isRunning = false;
          this.element.classList.remove("active");
          this.button.replaceChildren(SVG.play(), this.label);
          reject(error);
        },
      });
    });
  }

  set height(value: string) {
    this.valueElement.style.height = value;
  }

  set text(value: string) {
    this.valueElement.textContent = value;
  }

  get value(): number {
    if (this.isRunning && this.startTime === undefined) {
      return 0;
    } else if (this.isRunning) {
      return performance.now() - this.startTime!;
    } else {
      return this.lastExecutionTime;
    }
  }
}

export class CodeTimerBarGraph extends BaseElement {
  private bars: Map<string, Bar> = new Map();
  private container!: HTMLDivElement;
  private minValue: number = 5000;
  private sharedCode: string = "";

  init() {
    this.container = div({ class: "chart-container" });
    this.appendChild(this.container);

    const sharedElement = this.querySelector("shared");
    if (sharedElement) {
      this.sharedCode = sharedElement.textContent?.trim() || "";
      sharedElement.remove();
    }

    this.querySelectorAll("bar").forEach((barElement) => {
      barElement.remove();

      const barSpecificCode = barElement.textContent?.trim() || "";
      const label = barElement.getAttribute("label") || barSpecificCode;
      const code = this.sharedCode + "\n" + barSpecificCode;

      const bar = new Bar(label, code);
      this.bars.set(bar.id, bar);

      bar.onClick(() => {
        if (bar.isRunning) {
          return;
        }

        bar.disable();
        bar.run();

        const f = async () => {
          bar.text = formatValue(bar.value);
          this.updateAllBarHeights();

          if (!bar.isRunning) {
            bar.enable();
            return;
          }
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      });

      this.container.appendChild(bar.element);
    });

    this.role = "figure";
    this.ariaLabel =
      "A bar graph with buttons underneath each bar, clicking each button will time the execution of that bar's function.";
  }

  private updateAllBarHeights() {
    for (const bar of this.bars.values()) {
      this.minValue = Math.max(this.minValue, bar.value);
    }

    for (const bar of this.bars.values()) {
      const percent = (bar.value / this.minValue) * 100;
      bar.height = `${percent}%`;
      bar.text = formatValue(bar.value);
    }
  }
}
