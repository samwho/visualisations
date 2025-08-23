import { BaseElement } from "../core/BaseElement";
import { span } from "../core/DOM";
import { SVG } from "../core/SVG";

interface Extras {
  text?: string;
  icon?: Element | string;
  classes?: string[];
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
    const text = elem.getAttribute("text") || style?.text;
    if (style) {
      Object.assign(elem.style, style);
      if (text !== undefined) {
        const content = elem.innerHTML;
        if (content.length > 0 && content[0] === content[0]!.toUpperCase()) {
          elem.replaceChildren(span(text[0]!.toUpperCase() + text.slice(1)));
        } else {
          elem.replaceChildren(span(text));
        }
      }
    }
    if (style?.icon) {
      let icon: Element;
      const content = elem.innerHTML;
      if (typeof style.icon === "string") {
        icon = document.createElement("span");
        icon.textContent = style.icon;
      } else {
        icon = style.icon.cloneNode(true) as Element;
      }
      icon.role = "presentation";
      elem.replaceChildren(icon);
      if (content !== "") {
        elem.append(span(content));
      }
    }
    if (style?.classes) {
      elem.classList.add(...style.classes);
    }
  }

  static styleFor(
    elem: HTMLElement | string
  ): Partial<CSSStyleDeclaration & Extras> | undefined {
    const word = typeof elem === "string" ? elem : elem.innerText;
    switch (word) {
      case "run":
        return {
          icon: SVG.play(),
          classes: ["inline-button-icon"],
        };
      case "step":
        return {
          icon: SVG.skipForward(),
          classes: ["inline-button-icon"],
        };
      case "stepback":
        return {
          icon: SVG.skipBack(),
          classes: ["inline-button-icon"],
        };
      case "play":
        return {
          icon: SVG.play(),
          classes: ["inline-button-icon"],
        };
      case "pause":
        return {
          icon: SVG.pause(),
          classes: ["inline-button-icon"],
        };
      case "restart":
        return {
          icon: SVG.restart(),
          classes: ["inline-button-icon"],
        };
      case "best":
      case "worst":
      case "random":
      case "rand":
        return {
          classes: ["inline-button-icon"],
        };
    }
    return undefined;
  }

  async parsedCallback() {
    const self = this as unknown as HTMLElement;
    HighlightedWord.applyStyle(self);
  }
}
