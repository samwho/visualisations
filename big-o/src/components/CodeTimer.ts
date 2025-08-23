import { BaseElement } from "../core/BaseElement";
import { button, div } from "../core/DOM";
import { exec } from "../core/CodeWorker";
import { SVG } from "../core/SVG";

export class CodeTimer extends BaseElement {
  private runButton!: HTMLButtonElement;
  private timerDisplay!: HTMLDivElement;
  private titleElement?: HTMLDivElement;
  private controlsContainer!: HTMLDivElement;
  private codeContent: string = "";
  private isRunning: boolean = false;
  private startTime: number = 0;
  private animationFrameId: number = 0;

  init() {
    this.codeContent = this.textContent?.trim() || "";
    this.textContent = "";

    this.createElements();
    this.setupEventListeners();
  }

  private createElements() {
    const title = this.getAttribute("title");
    if (title) {
      this.titleElement = div(".timer-title", title);
      this.appendChild(this.titleElement);
    }

    this.role = "figure";
    this.ariaLabel = `Timing how long it takes ${title} to run`;

    this.controlsContainer = div(".timer-controls");
    this.runButton = button(".run-button", SVG.play());
    this.timerDisplay = div(
      { class: "timer-display", role: "timer", ariaAtomic: "true" },
      "00:00.000"
    );

    this.controlsContainer.appendChild(this.runButton);
    this.controlsContainer.appendChild(this.timerDisplay);

    this.appendChild(this.controlsContainer);
  }

  private setupEventListeners() {
    this.runButton.addEventListener("click", () => {
      if (!this.isRunning) {
        this.startTimer();
      }
    });
  }

  private startTimer() {
    this.isRunning = true;
    this.startTime = performance.now();

    this.runButton.disabled = true;
    this.runButton.replaceChildren(SVG.spinner());
    this.timerDisplay.classList.add("running");
    this.timerDisplay.classList.remove("completed");

    exec({
      code: this.codeContent,
      onStart: () => {
        this.updateTimer();
      },
      onComplete: () => {
        this.stopTimer();
      },
      onError: (error) => {
        console.error("Code execution error:", error);
      },
    });
  }

  private updateTimer() {
    if (!this.isRunning) return;

    const elapsed = performance.now() - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const milliseconds = Math.floor(elapsed % 1000);

    // Format time as MM:SS.mmm
    const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;

    this.timerDisplay.textContent = timeString;

    this.animationFrameId = requestAnimationFrame(() => this.updateTimer());
  }

  private stopTimer() {
    this.isRunning = false;
    cancelAnimationFrame(this.animationFrameId);

    // Update button and timer display
    this.runButton.disabled = false;
    this.runButton.replaceChildren(SVG.play());
    this.timerDisplay.classList.remove("running");
    this.timerDisplay.classList.add("completed");
  }
}
