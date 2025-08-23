import { BaseElement } from "../core/BaseElement";
import {
  div,
  input,
  label,
  table,
  thead,
  tbody,
  tr,
  th,
  td,
} from "../core/DOM";

interface GuessStep {
  guessNumber: number;
  possibilities: number;
  guess: number;
  response: string;
}

export class HigherOrLowerTable extends BaseElement {
  private targetNumber: number = 2;
  private label!: HTMLLabelElement;
  private sliderElement!: HTMLInputElement;
  private tableElement!: HTMLTableElement;
  private steps: GuessStep[] = [];

  init() {
    this.createUI();
    this.generateSteps();
    this.updateTable();
  }

  private createUI() {
    this.sliderElement = input({
      id: `${this.id}-slider`,
      type: "range",
      min: "1",
      step: "1",
      max: "100",
      value: this.targetNumber.toString(),
    });

    // Add event listeners after creating the element
    this.sliderElement.addEventListener("input", (e) =>
      this.handleSliderChange(e)
    );
    this.sliderElement.addEventListener("change", (e) =>
      this.handleSliderChange(e)
    );

    this.label = label(``);
    this.label.setAttribute("for", this.sliderElement.id);
    this.setLabel();

    const sliderContainer = div(
      ".slider-container",
      this.label,
      this.sliderElement
    );

    this.tableElement = table(
      thead(
        tr(th("Guess #"), th("Possibilities"), th("I guess"), th("You say"))
      ),
      tbody()
    );

    this.replaceChildren(sliderContainer, this.tableElement);
  }

  private setLabel() {
    const nonBreakingSpace = String.fromCharCode(160);
    const target = this.targetNumber.toString().padEnd(3, nonBreakingSpace);
    this.label.innerHTML = `Target: ${target}`;
  }

  private handleSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.targetNumber = parseInt(target.value);
    this.setLabel();
    this.generateSteps();
    this.updateTable();
  }

  private generateSteps() {
    this.steps = [];
    let minRange = 1;
    let maxRange = 100;
    let guessNumber = 1;

    while (minRange <= maxRange) {
      const possibilities = maxRange - minRange + 1;
      const guess = Math.floor((minRange + maxRange) / 2);

      let response: string;
      if (guess === this.targetNumber) {
        response = "Correct";
        this.steps.push({ guessNumber, possibilities, guess, response });
        break;
      } else if (guess > this.targetNumber) {
        response = "Lower";
        maxRange = guess - 1;
      } else {
        response = "Higher";
        minRange = guess + 1;
      }

      this.steps.push({ guessNumber, possibilities, guess, response });
      guessNumber++;
    }
  }

  private updateTable() {
    const tbody = this.tableElement.querySelector("tbody")!;
    tbody.innerHTML = "";

    // Always show 7 rows to prevent page reflow
    const maxRows = 7;

    for (let i = 0; i < maxRows; i++) {
      if (i < this.steps.length) {
        // Show actual step data
        const step = this.steps[i]!;
        const row = tr(
          td(step.guessNumber.toString()),
          td(step.possibilities.toString()),
          td(step.guess.toString()),
          td(
            { class: ["response", step.response.toLowerCase()] },
            step.response
          )
        );
        tbody.appendChild(row);
      } else {
        // Show empty row to maintain table height
        const row = tr(
          { class: "empty-row" },
          td("-"),
          td("-"),
          td("-"),
          td("-")
        );
        tbody.appendChild(row);
      }
    }
  }
}
