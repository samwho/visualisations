import { BaseElement } from "../core/BaseElement";
import {
  createCard,
  type Suit,
  CIRCLES,
  SQUARES,
  TRIANGLES,
  DIAMONDS,
  type Value,
} from "../core/Cards";

const elementName = `s-card`;

const stylesheet = document.createElement("style");
stylesheet.innerHTML = `
${elementName} {
}

`;
export class Card extends BaseElement {
  get suit(): Suit {
    switch (this.getAttribute("suit")) {
      case "Circles":
        return CIRCLES;
      case "Squares":
        return SQUARES;
      case "Triangles":
        return TRIANGLES;
      case "Diamonds":
        return DIAMONDS;
      default:
        return CIRCLES;
    }
  }

  get rank(): Value {
    return (this.getAttribute("rank") as Value) || "A";
  }

  setSuit(suit: string) {
    this.setAttribute("suit", suit);
    this.setCard(this.suit, this.rank);
  }

  setRank(rank: Value) {
    this.setAttribute("rank", rank);
    this.setCard(this.suit, this.rank);
  }

  setCard(suit: Suit, rank: Value) {
    this.removeChild(this.firstChild!);
    const card = createCard(suit, rank);
    this.appendChild(card.svg);
    this.setAttribute("role", "img");
    this.setAttribute("aria-label", `Card of ${rank} in ${suit}`);
  }

  init() {
    super.init();
    this.setCard(this.suit, this.rank);
  }
}
