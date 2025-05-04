import {
  createCard,
  cardHeight,
  cardWidth,
  cardCornerRadius,
  type Card,
  CIRCLES,
  DIAMONDS,
  SQUARES,
  TRIANGLES,
} from "../core/Cards";
import { button, div } from "../core/DOM";
import { BaseElement } from "../core/BaseElement";

const elementName = `s-random-select`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `
${elementName} {
  line-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  --border-width: min(0.3vw, 2px);
  --gap: min(1vw, 10px);
}

${elementName} .slots {
  width: 100%;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  display: grid;
  grid-template-rows: repeat(var(--rows), 1fr);
  grid-template-columns: repeat(var(--cols), 1fr);
  justify-items: center;
  gap: var(--gap);
}

${elementName} .card {
  display: block;
  width: 100%;
  pointer-events: none;
  aspect-ratio: ${cardWidth} / ${cardHeight};
  border: var(--border-width) solid #dddddd;
  border-radius: ${(cardCornerRadius / cardWidth) * 100}%;
  background-color: white;
  filter: grayscale(1) opacity(0.7);
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: filter, opacity, border;
}

${elementName} .card.selected {
  filter: grayscale(0) opacity(1);
  border: var(--border-width) solid #444444;
}

${elementName} .front {
  width: 100%;
  backface-visibility: hidden;
}

${elementName} .card svg {
  width: 100%;
}
`;
document.head.appendChild(stylesheet);

interface CardElement extends Card {
  element: HTMLDivElement;
}

export class RandomSelect extends BaseElement {
  get rows() {
    return parseInt(this.style.getPropertyValue("--rows"));
  }

  get cols() {
    return parseInt(this.style.getPropertyValue("--cols"));
  }

  set rows(value: number) {
    this.style.setProperty("--rows", value.toString());
  }

  set cols(value: number) {
    this.style.setProperty("--cols", value.toString());
  }

  get totalSlots() {
    return this.rows * this.cols;
  }

  slotContainer: HTMLDivElement;
  cards: CardElement[] = [];
  currentSlot = 1;

  init() {
    super.init();

    this.slotContainer = div({ classes: ["slots"] });
    this.appendChild(this.slotContainer);

    this.rows = 2;
    this.cols = 5;

    const cards = [
      createCard(CIRCLES, "A"),
      createCard(DIAMONDS, "4"),
      createCard(SQUARES, "K"),
      createCard(TRIANGLES, "2"),
      createCard(CIRCLES, "J"),
      createCard(DIAMONDS, "Q"),
      createCard(SQUARES, "5"),
      createCard(TRIANGLES, "8"),
      createCard(CIRCLES, "10"),
      createCard(SQUARES, "9"),
    ];

    for (const draw of cards) {
      const card = div(
        { classes: ["card"] },
        div({ classes: ["front"] }, draw.svg.cloneNode(true))
      );
      this.slotContainer.appendChild(card);
      this.cards.push({
        ...draw,
        element: card,
      });
    }

    const selectButton = button({
      text: "Select",
      onClick: () => this.select(),
    });
    this.appendChild(selectButton);
  }

  onSelectHandlers: ((cards: Card[]) => void)[] = [];
  onSelect(f: (cards: Card[]) => void) {
    this.onSelectHandlers.push(f);
  }

  selected(cards: Card[]) {
    for (const handler of this.onSelectHandlers) {
      handler(cards);
    }
  }

  async select(opts?: { n?: number; animate?: boolean; select?: number }) {
    const { n = 1, select = 3 } = opts || {};

    if (select > this.cards.length) {
      throw new Error("Cannot select more cards than available");
    }

    for (let i = 0; i < n; i++) {
      const indexes = new Set<number>();
      while (indexes.size < select) {
        const index = Math.floor(Math.random() * this.cards.length);
        indexes.add(index);
      }
      const selectedCards = Array.from(indexes).map(
        (index) => this.cards[index]
      );

      // Only animate the last selection
      if (i === n - 1) {
        for (const card of this.cards) {
          card.element.classList.remove("selected");
        }
        for (const card of selectedCards) {
          card.element.classList.add("selected");
        }
      }

      this.selected(selectedCards);
    }
  }
}
