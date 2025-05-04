import { BaseElement } from "../core/BaseElement";
import { cardCornerRadius, cardWidth, deck } from "../core/Cards";
import { div, input } from "../core/DOM";
import { numWithSuffix } from "../core/Utils";

const elementName = `s-card-odds-bar-chart`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `
${elementName} {
  width: 100%;

  display: flex;
  flex-direction: column;
}

${elementName} input[type="range"] {
  width: 100%;
  margin: 0.5rem 0;
}

${elementName} .draw-label {
  font-family: var(--code-font);
  display: block;
  margin: auto;
  padding-bottom: 0.5rem;
  font-size: 1rem;
}

${elementName} .label-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  font-family: var(--code-font);
  font-size: 1rem;
  font-weight: bold;
  max-width: 100%;
}

${elementName} .label-container div {
  word-break: break-word;
}

${elementName} .label-container .first-odds {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-grow: 1;
  flex-shrink: 0;
}

${elementName} .label-container .last-odds {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  gap: 0.5rem;
  text-align: right;
  flex-grow: 1;
  flex-shrink: 0;
}

${elementName} .label-container svg {
  width: 4rem;
  min-width: 4rem;
  max-width: 4rem;
  border-radius: ${(cardCornerRadius / cardWidth) * 100}%;
  border: 2px solid #bbbbbb;
}

${elementName} .chart-container {
  width: 100%;
  height: 200px;

  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: flex-end;
  gap: 1px;
  padding: 0.5rem;
  padding-bottom: 0;
  border-radius: 10px;
  border: 2px solid #bbbbbb;

  background-image:
    linear-gradient(to right, #bbbbbb 1px, transparent 1px),
    linear-gradient(to bottom, #bbbbbb 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: -1px -1px;
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
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

${elementName} .bar.selected {
  filter: grayscale(0);
  opacity: 1;
}

${elementName} .value {
  height: 1px;
  width: 100%;
  transition: height 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

${elementName} .counter {
  width: 100%;
  text-align: center;
  color: white;
  font-weight: bold;
}
`;
document.head.appendChild(stylesheet);

type Method = "coin-flip" | "reservoir";

class Bar {
  element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  get value(): HTMLElement {
    return this.element.querySelector(".value") as HTMLElement;
  }

  get count(): number {
    return parseFloat(this.element.getAttribute("data-value") || "0");
  }

  set count(value: number) {
    this.element.setAttribute("data-value", value.toFixed(20));
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
}

export class CardOddsBarChart extends BaseElement {
  bars: Bar[] = [];
  firstOdds: HTMLElement;
  lastOdds: HTMLElement;
  drawLabel: HTMLElement;
  lastSvg: SVGElement;

  minValue: number;
  method: Method = "coin-flip";

  init() {
    super.init();

    this.minValue = parseFloat(this.getAttribute("min-value") || "0");
    this.method = (this.getAttribute("method") as Method) || "coin-flip";

    const chart = div({ classes: ["chart-container"] });
    for (let i = deck.length - 1; i > 0; i--) {
      const card = deck[i];
      const item = div(
        { classes: ["bar"] },
        div(
          { classes: ["bar-container"] },
          div({
            classes: ["value"],
            style: { backgroundColor: card.suit.color },
          })
        )
      );
      chart.appendChild(item);
      this.bars.push(new Bar(item));
    }
    this.appendChild(chart);

    this.appendChild(
      input({
        type: "range",
        min: "0",
        max: "51",
        step: "1",
        value: "0",
        onInput: (e) => {
          const value = parseInt((e.target as HTMLInputElement).value);
          this.setValuesUpTo(value);
        },
      })
    );

    this.lastSvg = deck[deck.length - 1].svg.cloneNode(true) as SVGElement;
    this.firstOdds = div({ text: "-" });
    this.lastOdds = div({ text: "-" });

    this.drawLabel = div({
      classes: ["draw-label"],
      text: "Slide to draw cards.",
    });
    this.appendChild(this.drawLabel);

    const labelContainer = div(
      { classes: ["label-container"] },
      div(
        { classes: ["first-odds"] },
        deck[deck.length - 1].svg.cloneNode(true),
        div({ classes: ["labels"] }, div({ text: "card 1" }), this.firstOdds)
      ),
      div(
        { classes: ["last-odds"] },
        this.lastSvg,
        div({ classes: ["labels"] }, div({ text: "card -" }), this.lastOdds)
      )
    );
    this.appendChild(labelContainer);

    this.setHeights();
  }

  setValuesUpTo(card: number) {
    for (const bar of this.bars) {
      bar.count = 0;
      bar.deselect();
    }

    for (let n = 0; n < card; n++) {
      const bar = this.bars[n];
      if (this.method === "coin-flip") {
        bar.count = Math.pow(0.5, card - n);
      } else if (this.method === "reservoir") {
        bar.count = 1 / (card + 1);
      }
      bar.select();
    }

    const percentFormatter = new Intl.NumberFormat("en-US", {
      notation: "standard",
      style: "percent",
      minimumSignificantDigits: 2,
      maximumSignificantDigits: 2,
    });

    const lastLabel = this.querySelector(".last-odds .labels div")!;

    if (card === 0) {
      this.firstOdds.textContent = "-";
      this.lastOdds.textContent = "-";
      this.drawLabel.textContent = "Slide to draw cards.";
      lastLabel.textContent = "card -";
    } else {
      this.firstOdds.textContent = percentFormatter.format(this.bars[0].count);
      this.lastOdds.textContent = percentFormatter.format(
        this.bars[card - 1].count
      );
      this.drawLabel.textContent = `${numWithSuffix(
        card + 1
      )} draw, chance you are holding:`;
      lastLabel.textContent = `card ${card + 1}`;
    }

    const oldSvg = this.lastSvg;
    const newSvg = deck[deck.length - card - 1].svg.cloneNode(
      true
    ) as SVGElement;
    oldSvg.replaceWith(newSvg);
    this.lastSvg = newSvg;

    this.setHeights();
  }

  setHeights() {
    let maxValue = this.minValue;
    for (const bar of this.bars) {
      maxValue = Math.max(maxValue, bar.count);
    }

    for (const bar of this.bars) {
      const heightPercent = maxValue === 0 ? 0 : (bar.count / maxValue) * 100;
      bar.height = `max(0px, ${heightPercent}%)`;
    }
  }
}
