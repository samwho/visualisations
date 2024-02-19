import { six, seven, one, five, three } from "../core/Colors";
import { customElement } from "../core/Decorators";
import HTMLParsedElement from "html-parsed-element";

const WORDS: Record<string, Partial<CSSStyleDeclaration>> = {
  bit: {
    color: one.toRgbaString(),
    fontWeight: "bold",
  },
  bits: {
    color: one.toRgbaString(),
    fontWeight: "bold",
  },
  sha1: {
    color: one.toRgbaString(),
    fontWeight: "bold",
    fontFamily: "Fira Code, monospace",
  },
  sha256: {
    color: six.toRgbaString(),
    fontWeight: "bold",
    fontFamily: "Fira Code, monospace",
  },
  sha512: {
    color: seven.toRgbaString(),
    fontWeight: "bold",
    fontFamily: "Fira Code, monospace",
  },
  check: {
    color: five.toRgbaString(),
    fontWeight: "bold",
  },
  clear: {
    color: six.toRgbaString(),
    fontWeight: "bold",
  },
  add: {
    color: three.toRgbaString(),
    fontWeight: "bold",
  },
};

@customElement("s-word")
export default class HighlightedWord extends HTMLParsedElement {
  static applyStyle(elem: HTMLElement) {
    const style = WORDS[elem.innerText];
    if (style) {
      Object.assign(elem.style, style);
    }
  }

  static styleFor(
    elem: HTMLElement | string
  ): Partial<CSSStyleDeclaration> | undefined {
    const word = typeof elem === "string" ? elem : elem.innerText;
    return WORDS[word];
  }

  async parsedCallback() {
    const self = this as unknown as HTMLElement;
    HighlightedWord.applyStyle(self);
  }
}
