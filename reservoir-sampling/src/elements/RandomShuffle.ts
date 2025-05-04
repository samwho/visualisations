import {
  cardHeight,
  cardWidth,
  cardCornerRadius,
  type Card,
  createCard,
  CIRCLES,
  DIAMONDS,
  SQUARES,
  TRIANGLES,
} from "../core/Cards";
import { button, div } from "../core/DOM";
import { BaseElement } from "../core/BaseElement";

const elementName = `s-random-shuffle`;

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

${elementName} .slot {
  display: inline-block;
  width: 100%;
  aspect-ratio: ${cardWidth} / ${cardHeight};
  position: relative;
  line-height: 0;
}

${elementName} .card {
  display: inline-block;
  width: 100%;
  pointer-events: none;
  aspect-ratio: ${cardWidth} / ${cardHeight};
  position: absolute;
  border: var(--border-width) solid #dddddd;
  border-radius: ${(cardCornerRadius / cardWidth) * 100}%;
  background-color: white;
  will-change: filter, opacity, top, left, width, border;
}

${elementName} .front {
  position: absolute;
  width: 100%;
  backface-visibility: hidden;
  line-height: 0;
}

${elementName} .card svg {
  width: 100%;
}
`;
document.head.appendChild(stylesheet);

interface CardElement extends Card {
  element: HTMLDivElement;
}

export class RandomShuffle extends BaseElement {
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
  slots: HTMLDivElement[] = [];
  cards: CardElement[] = [];
  currentSlot = 1;

  init() {
    super.init();

    this.slotContainer = div({ classes: ["slots"] });
    this.appendChild(this.slotContainer);

    this.rows = 2;
    this.cols = 5;

    for (let i = 0; i < this.totalSlots; i++) {
      const slot = div({ classes: ["slot"] });
      this.slots.push(slot);
      this.slotContainer.appendChild(slot);
    }

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

    for (const [i, draw] of cards.entries()) {
      const slot = this.slots[i];
      const card = div(
        { classes: ["card"], style: { width: `${slot.offsetWidth}px` } },
        div({ classes: ["front"] }, draw.svg.cloneNode(true))
      );
      this.slotContainer.appendChild(card);
      this.cards.push({
        ...draw,
        element: card,
      });
    }

    const shuffleButton = button({
      text: "Shuffle",
      onClick: () => this.shuffle(),
    });
    this.appendChild(shuffleButton);

    requestAnimationFrame(() => {
      this.setPositions({ animate: false });
    });

    this.onPageResize(() => {
      this.setPositions({ animate: false });
    });
  }

  async setPositions(opts?: { animate?: boolean }) {
    const { animate = true } = opts || {};
    for (const [i, { element }] of this.cards.entries()) {
      const style: Keyframe = {};
      const slot = this.slots[i];
      if (i < 3) {
        style.filter = "grayscale(0)";
        style.opacity = "1";
        style.border = "var(--border-width) solid #444444";
      } else {
        style.filter = "grayscale(1)";
        style.opacity = "0.7";
        style.border = "var(--border-width) solid #dddddd";
      }
      style.top = `${slot.offsetTop}px`;
      style.left = `${slot.offsetLeft}px`;
      style.width = `${slot.offsetWidth}px`;

      if (!animate) {
        element.style.top = style.top;
        element.style.left = style.left;
        element.style.width = style.width;
        element.style.filter = style.filter;
        element.style.opacity = style.opacity;
        element.style.border = style.border;
        continue;
      }

      element
        .animate([style], {
          duration: 500,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          fill: "forwards",
        })
        .finished.then((a) => {
          a.commitStyles();
          a.cancel();
        });
    }
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

  async shuffle(opts?: { animate?: boolean; n?: number }) {
    const { n = 1 } = opts || {};
    for (let i = 0; i < n; i++) {
      this.cards.sort(() => Math.random() - 0.5);
      this.selected(this.cards.slice(0, 3));
    }
    this.setPositions(opts);
  }
}
