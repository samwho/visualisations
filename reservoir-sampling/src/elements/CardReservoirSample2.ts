import {
  deck,
  back as cardBack,
  cardWidth,
  cardHeight,
  cardCornerRadius,
} from "../core/Cards";
import { button, div } from "../core/DOM";
import { BaseElement } from "../core/BaseElement";
import { SimpleReservoir, type Reservoir } from "../core/Samplers";

const elementName = `s-card-reservoir-sample-2`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `

${elementName} {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;

  --aspect-ratio: ${cardWidth} / ${cardHeight};
  --border-width: min(0.3vw, 2px);

  --card-border: #dddddd;
  --card-background: white;

  --border-radius: ${(cardCornerRadius / cardWidth) * 100}%;
}

${elementName} .label {
  font-family: var(--code-font);
  font-weight: bold;
  display: block;
  line-height: 1.5;
  min-height: 2em;
  color: var(--palette-green);
  padding-bottom: 0.5rem;
}

${elementName} .slots {
  width: 100%;
  display: grid;
  grid-template-rows: 1fr 1fr;
  grid-template-columns: repeat(5, 1fr);
  justify-items: center;
  gap: 1rem;
  perspective: 800px;
  container-type: inline-size;
  margin-bottom: 0.5rem;
}

${elementName} .slot {
  display: inline-block;
  width: 100%;
  aspect-ratio: var(--aspect-ratio);
  position: relative;
  border-radius: var(--border-radius);
}

${elementName} .slot.chosen {
  outline: 2px dashed var(--palette-blue);
}

${elementName} .slot:not(.chosen, .deck) {
  outline: 2px dashed var(--palette-red);
}

${elementName} .slot.random {
  outline: 3px solid var(--palette-green);
}

${elementName} .card {
  display: inline-block;
  pointer-events: none;
  aspect-ratio: ${cardWidth} / ${cardHeight};
  position: absolute;
  top: 0;
  left: 0;
  border: var(--border-width) solid var(--card-border);
  border-radius: var(--border-radius);
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

export class CardReservoirSample2 extends BaseElement {
  dealButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;

  slotContainer: HTMLDivElement;

  slots: HTMLDivElement[] = [];
  deck: HTMLDivElement[] = [];
  cards: HTMLDivElement[] = [];

  label: HTMLDivElement;

  sampler: Reservoir<HTMLDivElement>;

  zIndex = 0;

  init() {
    super.init();

    this.sampler = new SimpleReservoir<HTMLDivElement>(1);

    this.label = div({ classes: ["label"] });
    this.label.textContent = "";
    this.appendChild(this.label);

    this.slotContainer = div({ classes: ["slots"] });
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

    for (let i = 0; i < 10; i++) {
      const classes = ["slot"];
      if (i === 0) {
        classes.push("deck");
      } else if (i < 3) {
        classes.push("chosen");
      }
      const slot = div({ classes });
      this.slotContainer.appendChild(slot);
      this.slots.push(slot);
    }

    for (const [i, draw] of deck.entries()) {
      const front = div({ classes: ["front"] });
      const back = div({ classes: ["back"] });
      front.appendChild(draw.svg.cloneNode(true));

      const card = div({ classes: ["card"] });
      card.setAttribute("data-sort-index", i.toString());
      back.appendChild(cardBack.cloneNode(true));
      card.appendChild(front);
      card.appendChild(back);
      this.teleport(card, this.slots[0]);
      this.slotContainer.appendChild(card);
      this.deck.push(card);
    }
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

    if (this.cards.length < 2) {
      this.move(card, this.slots[this.cards.length + 1], {
        transform: "rotateY(180deg)",
      });
      this.cards.push(card);
      return;
    }

    let i = Math.floor(Math.random() * (this.cards.length + 1));
    const rand = i;

    if (i < 2) {
      this.move(card, this.slots[i + 1], { transform: "rotateY(180deg)" });
      const displaced = this.cards.splice(i, 1, card)[0];
      this.cards.push(displaced);
      this.move(displaced, this.slots[this.cards.length], {
        transform: "rotateY(180deg)",
      });
    } else {
      i = this.cards.length;
      this.cards.push(card);
    }
    this.move(card, this.slots[i + 1], { transform: "rotateY(180deg)" });

    this.label.textContent = `randBetween(0, ${this.cards.length}) = ${rand}`;
    for (const slot of this.slots) {
      slot.classList.remove("random");
    }
    this.slots[rand + 1].classList.add("random");

    if (this.cards.length === 9) {
      this.dealButton.disabled = true;
    }
  }

  reset() {
    this.deck = this.deck.concat(this.cards);
    this.label.textContent = "";

    for (const slot of this.slots) {
      slot.classList.remove("random");
    }

    for (const card of this.cards) {
      this.move(card, this.slots[0], {
        transform: "rotateY(0deg)",
      });
    }
    this.cards = [];
    this.zIndex = 0;

    this.dealButton.disabled = false;
    this.resetButton.disabled = true;

    this.sampler.reset();

    for (const card of this.deck) {
      // Bit of a hack here to fix Safari rotating the cards the wrong
      // direction after reset.
      this.move(card, this.slots[0], { transform: "rotateY(0.1deg)" });
    }

    this.deck.sort((a, b) => {
      const aIndex = parseInt(a.getAttribute("data-sort-index")!);
      const bIndex = parseInt(b.getAttribute("data-sort-index")!);
      return aIndex - bIndex;
    });
  }
}
