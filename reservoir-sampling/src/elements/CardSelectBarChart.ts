import { BaseElement } from "../core/BaseElement";
import { div } from "../core/DOM";
import type { RandomShuffle } from "./RandomShuffle";

const elementName = `s-card-select-bar-chart`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `
${elementName} {
  width: 100%;
  height: 150px;

  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: flex-end;
  gap: 0.5rem;
}

${elementName} .bar-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
  width: 100%;
}

${elementName} .bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
  filter: grayscale(1);
  opacity: 0.7;

  transition: filter 0.5s ease, opacity 0.5s ease;
  will-change: filter, opacity, height;
}

${elementName} .bar.selected {
  filter: grayscale(0);
  opacity: 1;
}

${elementName} .value {
  height: 5px;
  width: 100%;
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  transition: height 0.3s ease;
}

${elementName} .counter {
  width: 100%;
  text-align: center;
  color: white;
  font-weight: bold;
}
`;
document.head.appendChild(stylesheet);

function isCorrectElem(elem: HTMLElement): elem is RandomShuffle {
  return "onSelect" in elem;
}

class Bar {
  element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  get value(): HTMLElement {
    return this.element.querySelector(".value") as HTMLElement;
  }

  get counter(): HTMLElement {
    return this.element.querySelector(".counter") as HTMLElement;
  }

  get count(): number {
    return parseInt(this.counter.textContent || "0");
  }

  set count(value: number) {
    this.counter.textContent = value.toString();
  }

  set height(value: string) {
    this.value.style.height = value;
  }

  select() {
    this.element.classList.add("selected");
  }

  deselect() {
    this.element.classList.remove("selected");
  }

  increment() {
    this.count += 1;
  }
}

export class CardSelectBarChart extends BaseElement {
  bars: Record<string, Bar> = {};

  init() {
    super.init();

    const target = this.getAttribute("target");
    if (!target) {
      throw new Error("Missing target attribute");
    }

    const targetElement = document.getElementById(target);
    if (!targetElement) {
      throw new Error("Target element not found");
    }

    if (!isCorrectElem(targetElement)) {
      throw new Error("Target element is not correct type");
    }

    this.bars = {};
    targetElement.afterInit(() => {
      for (const { suit, value } of targetElement.cards) {
        const item = div({
          classes: ["bar"],
        });
        const label = div({
          text: `${value}`,
          style: { color: suit.color, fontWeight: "bold" },
        });
        const counter = div({
          text: "0",
          classes: ["counter"],
          style: {
            display: "none",
            backgroundColor: suit.color,
          },
        });
        const barContainer = div({
          classes: ["bar-container"],
        });
        item.appendChild(barContainer);
        const bar = div({
          classes: ["value"],
          id: `${suit.name}-${value}`,
          style: {
            backgroundColor: suit.color,
          },
        });
        barContainer.appendChild(bar);
        item.appendChild(counter);
        item.appendChild(label);
        this.appendChild(item);
        this.bars[`${suit.name}-${value}`] = new Bar(item);
      }

      let total = 0;
      targetElement.onSelect((cards) => {
        total += 1;

        let maxValue = 10;
        for (const bar of Object.values(this.bars)) {
          bar.deselect();
          maxValue = Math.max(maxValue, bar.count);
        }

        for (const card of cards) {
          const bar = this.bars[`${card.suit.name}-${card.value}`];
          bar.increment();
          bar.select();
        }

        for (const bar of Object.values(this.bars)) {
          const heightPercent = (bar.count / maxValue) * 100;
          bar.height = `calc(5px + ${heightPercent}%)`;
        }
      });
    });
  }

  reset() {
    for (const bar of Object.values(this.bars)) {
      bar.count = 0;
      bar.height = "5px";
      bar.deselect();
    }
  }
}
