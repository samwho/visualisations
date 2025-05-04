import { BaseElement } from "../core/BaseElement";
import { cssVar } from "../core/Utils";

const DEFAULT_ELEM_STYLE: Partial<CSSStyleDeclaration> = {
  display: "inline-flex",
  alignItems: "baseline",
  whiteSpace: "nowrap",
  fontWeight: "bold",
};

interface Extras {
  text?: string;
  icon?: Element | string;
}

export class HighlightedWord extends BaseElement {
  static applyStyle(elem: HTMLElement) {
    const key = (
      elem.getAttribute("key") ||
      elem.attributes[0]?.name ||
      elem.innerHTML
    )
      .toLowerCase()
      .replace(/\n/g, " ");
    const style = HighlightedWord.styleFor(key);
    if (style) {
      Object.assign(elem.style, style);
      if (style.text) {
        if (elem.innerHTML[0] === elem.innerHTML[0]!.toUpperCase()) {
          elem.innerHTML = style.text[0]!.toUpperCase() + style.text.slice(1);
        } else {
          elem.innerHTML = style.text;
        }
      }
    }
    if (style?.icon) {
      let icon: Element;
      if (typeof style.icon === "string") {
        icon = document.createElement("span");
        icon.textContent = style.icon;
      } else {
        icon = style.icon.cloneNode(true) as Element;
      }
      icon.role = "presentation";
      elem.prepend(icon);
    }
  }

  static styleFor(
    elem: HTMLElement | string
  ): Partial<CSSStyleDeclaration & Extras> | undefined {
    const word = typeof elem === "string" ? elem : elem.innerText;
    switch (word) {
      case "threshold":
        return {
          ...DEFAULT_ELEM_STYLE,
          color: cssVar("--palette-red"),
          fontWeight: "bold",
        };
      case "black":
      case "sent":
      case "sent logs":
        return {
          ...DEFAULT_ELEM_STYLE,
          color: "black",
          fontWeight: "bold",
        };
      case "grey":
      case "total":
      case "total logs":
        return {
          ...DEFAULT_ELEM_STYLE,
          color: "#777777",
          fontWeight: "bold",
        };
      case "held card":
        return {
          ...DEFAULT_ELEM_STYLE,
          color: "var(--palette-dark-blue)",
          border: `1px dashed var(--palette-dark-blue)`,
          borderRadius: "5px",
          paddingLeft: "0.3rem",
          paddingRight: "0.3rem",
          fontWeight: "bold",
        };

      case "hold":
        return {
          ...DEFAULT_ELEM_STYLE,
          color: "var(--palette-dark-blue)",
          fontWeight: "bold",
        };

      case "discard pile":
        return {
          ...DEFAULT_ELEM_STYLE,
          color: "var(--palette-red)",
          border: `1px dashed var(--palette-red)`,
          borderRadius: "5px",
          paddingLeft: "0.3rem",
          paddingRight: "0.3rem",
          fontWeight: "bold",
        };

      case "discard":
      case "replace":
        return {
          ...DEFAULT_ELEM_STYLE,
          color: "var(--palette-red)",
          fontWeight: "bold",
        };
    }
    return undefined;
  }

  static parse(elem: HTMLElement) {
    elem.innerHTML = elem.innerHTML.replace(/!([\p{L}]+)/gu, (match, word) => {
      if (word === "important" || word === "--") {
        return `!${word}`;
      }
      return `<h->${word}</h->`;
    });
  }

  async parsedCallback() {
    const self = this as unknown as HTMLElement;
    HighlightedWord.applyStyle(self);
  }
}
