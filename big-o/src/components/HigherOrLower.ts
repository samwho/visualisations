import { BaseElement } from "../core/BaseElement";
import { button, div } from "../core/DOM";

export class HigherOrLower extends BaseElement {
  private currentGuess: number = 50;
  private minRange: number = 1;
  private maxRange: number = 100;
  private isGameOver: boolean = false;
  private currentGuessNumber: number = 1;

  private titleElement!: HTMLDivElement;
  private guessCounterElement!: HTMLDivElement;
  private numberElement!: HTMLDivElement;
  private lowerButton!: HTMLButtonElement;
  private correctButton!: HTMLButtonElement;
  private higherButton!: HTMLButtonElement;
  private buttonsContainer!: HTMLDivElement;

  init() {
    this.resetGame();
    this.createUI();
  }

  private resetGame() {
    this.currentGuess = 50;
    this.minRange = 1;
    this.maxRange = 100;
    this.isGameOver = false;
    this.currentGuessNumber = 1;
  }

  private createUI() {
    // Title
    this.titleElement = div(
      {
        class: "title",
      },
      "Is your number..."
    );

    // Guess counter
    this.guessCounterElement = div(
      {
        class: "guess-counter",
      },
      `Guess #${this.currentGuessNumber}`
    );

    // Large centered number
    this.numberElement = div(
      {
        class: "guess-number",
      },
      this.currentGuess.toString()
    );

    // Buttons
    this.lowerButton = button(
      {
        class: "lower-button",
        onclick: () => this.handleLower(),
      },
      "Lower"
    );

    this.correctButton = button(
      {
        class: "correct-button",
        onclick: () => this.handleCorrect(),
      },
      "Correct!"
    );

    this.higherButton = button(
      {
        class: "higher-button",
        onclick: () => this.handleHigher(),
      },
      "Higher"
    );

    this.buttonsContainer = div(
      {
        class: "buttons",
      },
      this.lowerButton,
      this.correctButton,
      this.higherButton
    );

    this.replaceChildren(
      this.guessCounterElement,
      this.titleElement,
      this.numberElement,
      this.buttonsContainer
    );
  }

  private async handleLower() {
    if (this.isGameOver) return;

    // User's number is lower than our guess
    this.maxRange = this.currentGuess - 1;
    this.currentGuessNumber++;
    await this.updateGuess();
    this.updateButtons();
  }

  private async handleHigher() {
    if (this.isGameOver) return;

    // User's number is higher than our guess
    this.minRange = this.currentGuess + 1;
    this.currentGuessNumber++;
    await this.updateGuess();
    this.updateButtons();
  }

  private handleCorrect() {
    this.isGameOver = true;
    if (this.currentGuess === 69) {
      this.titleElement.textContent = "Nice.";
    } else {
      this.titleElement.textContent = "Got it! 🎉";
    }
    this.createConfetti();

    // Replace all buttons with play again button
    this.buttonsContainer.innerHTML = "";
    const resetButton = button(
      {
        class: "play-again-button",
        onclick: () => this.startNewGame(),
      },
      "Play Again"
    );

    this.buttonsContainer.appendChild(resetButton);
  }

  private async updateGuess() {
    if (this.minRange > this.maxRange) {
      // This shouldn't happen in a proper game
      this.titleElement.textContent = "Something went wrong! 🤔";
      this.buttonsContainer.innerHTML = "";
      return;
    }

    const fromGuess = this.currentGuess;
    const toGuess = Math.floor((this.minRange + this.maxRange) / 2);
    this.currentGuess = toGuess;
    this.guessCounterElement.textContent = `Guess #${this.currentGuessNumber}`;
    await this.animateNumberChange(fromGuess, toGuess);
  }

  private updateButtons() {
    // Disable lower button if we can't go lower
    this.lowerButton.disabled = this.minRange >= this.currentGuess;

    // Disable higher button if we can't go higher
    this.higherButton.disabled = this.maxRange <= this.currentGuess;

    // Auto-trigger correct if both higher and lower are disabled
    if (
      this.lowerButton.disabled &&
      this.higherButton.disabled &&
      !this.isGameOver
    ) {
      this.handleCorrect();
    }
  }

  private startNewGame() {
    this.resetGame();
    this.titleElement.textContent = "Is your number...";
    this.guessCounterElement.textContent = `Guess #${this.currentGuessNumber}`;
    this.numberElement.textContent = this.currentGuess.toString();

    // Restore original buttons
    this.buttonsContainer.innerHTML = "";
    this.buttonsContainer.append(
      this.lowerButton,
      this.correctButton,
      this.higherButton
    );

    // Reset button states
    [this.lowerButton, this.correctButton, this.higherButton].forEach(
      (button) => {
        button.disabled = false;
      }
    );

    this.updateButtons();
  }

  private async animateNumberChange(
    fromNumber: number,
    toNumber: number
  ): Promise<void> {
    const startNumber = fromNumber;
    const duration = 200; // Half second
    const steps = 10;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentDisplayNumber = Math.round(
        startNumber + (toNumber - startNumber) * progress
      );
      this.numberElement.textContent = currentDisplayNumber.toString();

      if (i < steps) {
        await new Promise((resolve) => setTimeout(resolve, stepDuration));
      }
    }
  }

  private createConfetti() {
    const colors = [
      "var(--palette-orange)",
      "var(--palette-red)",
      "var(--palette-blue)",
      "var(--palette-green)",
      "var(--palette-yellow)",
      "var(--palette-pink)",
    ];
    const shapes = ["square", "circle"];
    const totalConfetti = 75;
    const spawnDuration = 1000;

    for (let i = 0; i < totalConfetti; i++) {
      const spawnDelay = (i / totalConfetti) * spawnDuration;

      setTimeout(() => {
        const confetti = document.createElement("div");
        confetti.setAttribute("aria-hidden", "true");
        const shape = shapes[Math.floor(Math.random() * shapes.length)]!;
        confetti.className = `confetti ${shape}`;
        confetti.style.backgroundColor =
          colors[Math.floor(Math.random() * colors.length)]!;
        confetti.style.left = Math.random() * 100 + "vw";
        confetti.style.top = "-10px";

        document.body.appendChild(confetti);

        const animation = confetti.animate(
          [
            {
              transform: `translateY(-10px) translateX(0px) rotate(0deg)`,
              opacity: 1,
            },
            {
              transform: `translateY(100vh) translateX(${
                (Math.random() - 0.5) * 300
              }px) rotate(${Math.random() * 720}deg)`,
              opacity: 0,
            },
          ],
          {
            duration: 2000 + Math.random() * 2000,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            fill: "forwards",
          }
        );

        animation.addEventListener("finish", () => {
          confetti.remove();
        });
      }, spawnDelay);
    }
  }
}
