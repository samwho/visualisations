import {
  deck,
  back as cardBack,
  cardWidth,
  cardHeight,
  cardCornerRadius,
} from "../core/Cards";
import { button, div } from "../core/DOM";
import { BaseElement } from "../core/BaseElement";
import {
  FairCoinSampler,
  RandomSampler,
  SimpleReservoir,
  type Sampler,
} from "../core/Samplers";

const elementName = `s-card-reservoir-sample`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `

${elementName} {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 500px;
  margin: auto;
  margin-bottom: 1rem;

  --border-radius: ${(cardCornerRadius / cardWidth) * 100}%;
  --aspect-ratio: ${cardWidth} / ${cardHeight};
  --border-width: min(0.3vw, 2px);

  --card-border: #dddddd;
  --card-background: white;

  --new-odds: color-mix(in srgb, var(--palette-blue), black 20%);
  --previous-odds: color-mix(in srgb, var(--palette-pink), black 40%);
  --survival-odds: var(--palette-pink);
}

${elementName} .slots {
  width: 100%;
  display: grid;
  grid-template-rows: 1fr 2rem;
  grid-template-columns: repeat(3, 1fr);
  grid-template-areas:
    "deck chosen discard"
    "label1 label2 label3";
  justify-items: center;
  gap: 0.5rem 2rem;
  perspective: 800px;
  container-type: inline-size;
  margin-bottom: 0.25rem;
}

${elementName} .slots.no-labels {
  grid-template-rows: 1fr;
  grid-template-columns: repeat(3, 1fr);
  grid-template-areas: "deck chosen discard";
}

${elementName} .heads-tails-label {
  font-family: var(--code-font);
  font-weight: bold;
  margin-bottom: 0.25rem;
  min-height: 2rem;
}

${elementName} .heads-tails-label.heads {
  color: var(--palette-dark-blue);
}

${elementName} .heads-tails-label.tails {
  color: var(--palette-red);
}

${elementName} .slot {
  display: inline-block;
  width: 100%;
  aspect-ratio: var(--aspect-ratio);
  position: relative;
}

${elementName} .label1-container {
  height: 2rem;
  overflow: hidden;
  grid-area: label1;
  font-family: var(--code-font);
  font-weight: bold;
  font-size: min(1.5rem, 4cqi);
  white-space: nowrap;
}

${elementName} .label2-container {
  color: var(--palette-dark-blue);
  height: 2rem;
  overflow: hidden;
  grid-area: label2;
  font-family: var(--code-font);
  font-weight: bold;
  font-size: min(1.5rem, 4cqi);
  white-space: nowrap;
}

${elementName} .label3-container {
  color: var(--palette-red);
  height: 2rem;
  overflow: hidden;
  grid-area: label3;
  font-family: var(--code-font);
  font-weight: bold;
  font-size: min(1.5rem, 4cqi);
  white-space: nowrap;
}

${elementName} .deck {
  grid-area: deck;
}

${elementName} .chosen {
  grid-area: chosen;
  outline: 2px dashed var(--palette-dark-blue);
  border-radius: var(--border-radius);
}

${elementName} .discard {
  grid-area: discard;
  outline: 2px dashed var(--palette-red);
  border-radius: var(--border-radius);
}

${elementName} .card {
  display: inline-block;
  pointer-events: none;
  aspect-ratio: ${cardWidth} / ${cardHeight};
  position: absolute;
  top: 0;
  left: 0;
  border: var(--border-width) solid var(--card-border);
  border-radius: ${(cardCornerRadius / cardWidth) * 100}%;
  background-color: var(--card-background);
  transform-style: preserve-3d;
  transform: rotateY(0deg);
}

${elementName} .front, ${elementName} .back {
  position: absolute;
  height: 100%;
  width: 100%;
  backface-visibility: hidden;
  /* hack for Firefox https://stackoverflow.com/a/36019426/205770 */
  transform: rotateX(0deg);
}

${elementName} .front {
  transform: rotateY(180deg);
}

${elementName} .card svg {
  width: 100%;
  height: 100%;
}
`;
document.head.appendChild(stylesheet);

type Method = "coin-flip" | "reservoir";

export class CardReservoirSample extends BaseElement {
  dealButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;

  label1: HTMLDivElement;
  label2: HTMLDivElement;
  label3: HTMLDivElement;

  slotContainer: HTMLDivElement;

  deckSlot: HTMLDivElement;
  chosenSlot: HTMLDivElement;
  discardSlot: HTMLDivElement;

  headsTailsLabel?: HTMLDivElement;

  deck: HTMLDivElement[] = [];
  discardPile: HTMLDivElement[] = [];
  chosen: HTMLDivElement | null = null;

  sampler: Sampler<HTMLDivElement>;

  chosenSurvival: number[] = [];

  zIndex = 0;

  method: Method;
  showCounts = false;

  countHold = 0;
  countDiscard = 0;

  init() {
    super.init();

    this.showCounts = this.getAttribute("show-counts") === "true";

    this.method = (this.getAttribute("method") as Method) || "reservoir";
    if (this.method !== "coin-flip" && this.method !== "reservoir") {
      throw new Error(`Invalid method: ${this.method}`);
    }

    if (this.method === "coin-flip") {
      this.sampler = new FairCoinSampler<HTMLDivElement>();
      this.headsTailsLabel = div({ classes: ["heads-tails-label"] });
      this.appendChild(this.headsTailsLabel);
    } else {
      this.sampler = new SimpleReservoir<HTMLDivElement>(1);
    }

    this.slotContainer = div({ classes: ["slots"] });
    if (!this.showCounts) {
      this.slotContainer.classList.add("no-labels");
    }
    this.appendChild(this.slotContainer);

    const controls = div({ classes: ["controls"] });
    this.appendChild(controls);

    this.dealButton = button({
      text: "Deal",
      onClick: () => this.deal(),
    });
    controls.appendChild(this.dealButton);

    this.resetButton = button({
      text: "Reset",
      onClick: () => {
        this.reset();
      },
    });
    this.resetButton.disabled = true;
    controls.appendChild(this.resetButton);

    if (this.showCounts) {
      this.label1 = div({ classes: ["label1-container"] });
      this.label1.textContent = "";
      this.slotContainer.appendChild(this.label1);

      this.label2 = div({ classes: ["label2-container"] });
      this.label2.textContent = "0";
      this.slotContainer.appendChild(this.label2);

      this.label3 = div({ classes: ["label3-container"] });
      this.label3.textContent = "0";
      this.slotContainer.appendChild(this.label3);
    }

    this.deckSlot = div({ classes: ["slot", "deck"] });
    this.chosenSlot = div({ classes: ["slot", "chosen"] });
    this.discardSlot = div({ classes: ["slot", "discard"] });

    this.slotContainer.appendChild(this.deckSlot);
    this.slotContainer.appendChild(this.chosenSlot);
    this.slotContainer.appendChild(this.discardSlot);

    for (const [i, draw] of deck.entries()) {
      const front = div({ classes: ["front"] });
      const back = div({ classes: ["back"] });
      front.appendChild(draw.svg.cloneNode(true));

      const card = div({ classes: ["card"] });
      card.setAttribute("data-sort-index", i.toString());
      back.appendChild(cardBack.cloneNode(true));
      card.appendChild(front);
      card.appendChild(back);
      this.teleport(card, this.deckSlot);
      this.slotContainer.appendChild(card);
      this.deck.push(card);
    }

    this.onResize(() => {
      for (const card of this.deck) {
        this.teleport(card, this.deckSlot);
      }

      for (const card of this.discardPile) {
        this.teleport(card, this.discardSlot);
      }

      if (this.chosen) {
        this.teleport(this.chosen, this.chosenSlot);
      }
    });
  }

  async teleport(card: HTMLDivElement, slot: HTMLDivElement): Promise<void> {
    await Promise.all(card.getAnimations().map((a) => a.finished));

    const transforms = card.style.transform.replaceAll(
      /translate\(([^)]+)\)/g,
      ""
    );

    card.style.transform = `translate(${slot.offsetLeft}px, ${slot.offsetTop}px) ${transforms}`;
    card.style.width = `${slot.offsetWidth}px`;
  }

  async move(
    card: HTMLDivElement,
    slot: HTMLDivElement,
    extra?: Keyframe
  ): Promise<void> {
    card.style.zIndex = (this.zIndex++).toString();
    let transform = `translate(${slot.offsetLeft}px, ${slot.offsetTop}px)`;
    if (extra?.transform) {
      transform = `${transform} ${extra.transform}`;
      delete extra.transform;
    }

    return card
      .animate([{ transform, ...extra }], {
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        duration: 500,
        fill: "forwards",
      })
      .finished.then((a) => {
        a.commitStyles();
        a.cancel();
      });
  }

  choose(card: HTMLDivElement) {
    this.move(card, this.chosenSlot, { transform: "rotateY(180deg)" });
    if (this.chosen) {
      this.discard(this.chosen);
    }
    this.chosen = card;
  }

  discard(card: HTMLDivElement) {
    this.discardPile.push(card);
    this.move(card, this.discardSlot, {
      transform: "rotateY(180deg)",
    });
  }

  draw(): HTMLDivElement | undefined {
    return this.deck.pop();
  }

  async deal() {
    const card = this.draw();
    if (!card) {
      this.dealButton.disabled = true;
      return;
    }

    this.dealButton.disabled = false;
    this.resetButton.disabled = false;
    if (this.sampler.sample(card)) {
      this.countHold++;
      if (this.showCounts) {
        this.label2.textContent = `${this.countHold}`;
      }
      this.choose(card);

      if (this.headsTailsLabel) {
        this.headsTailsLabel.classList.add("heads");
        this.headsTailsLabel.classList.remove("tails");
        this.headsTailsLabel.textContent = "Heads! Hold.";
      }
    } else {
      this.countDiscard++;
      if (this.showCounts) {
        this.label3.textContent = `${this.countDiscard}`;
      }
      this.discard(card);
      if (this.headsTailsLabel) {
        this.headsTailsLabel.classList.remove("heads");
        this.headsTailsLabel.classList.add("tails");
        this.headsTailsLabel.textContent = "Tails! Discard.";
      }
    }
  }

  reset() {
    if (this.chosen) {
      this.deck.push(this.chosen);
    }
    this.deck = this.deck.concat(this.discardPile);
    this.zIndex = 0;
    this.discardPile = [];
    this.chosen = null;
    this.chosenSurvival = [];

    this.dealButton.disabled = false;
    this.resetButton.disabled = true;

    if (this.sampler instanceof SimpleReservoir) {
      this.sampler.reset();
    }

    this.countHold = 0;
    this.countDiscard = 0;

    if (this.showCounts) {
      this.label1.textContent = "";
      this.label2.textContent = "0";
      this.label3.textContent = "0";
    }

    for (const card of this.deck) {
      // Bit of a hack here to fix Safari rotating the cards the wrong
      // direction after reset.
      this.move(card, this.deckSlot, { transform: "rotateY(0.1deg)" });
    }

    this.deck.sort((a, b) => {
      const aIndex = parseInt(a.getAttribute("data-sort-index")!);
      const bIndex = parseInt(b.getAttribute("data-sort-index")!);
      return aIndex - bIndex;
    });

    if (this.method === "coin-flip") {
      this.sampler = new FairCoinSampler<HTMLDivElement>();
    } else {
      this.sampler = new SimpleReservoir<HTMLDivElement>(1);
    }
  }
}
