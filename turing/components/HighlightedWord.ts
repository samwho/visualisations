// @ts-expect-error
import HTMLParsedElement from "html-parsed-element";
import {
  HEAD,
  INSTRUCTION,
  STATE,
  VALUE,
  findContrastingColor,
} from "../core/Colors";
import { span } from "../core/DOM";
import { SVG } from "../core/SVG";

const DEFAULT_ICON_STYLE: Partial<CSSStyleDeclaration> = {
  display: "inline",
  width: "1rem",
  height: "1rem",
  marginRight: "0.2rem",
  verticalAlign: "middle",
};

const DEFAULT_ELEM_STYLE: Partial<CSSStyleDeclaration> = {
  display: "inline-flex",
  alignItems: "baseline",
  whiteSpace: "nowrap",
  fontWeight: "bold",
};

const ROUNDED_RECT = SVG.roundedRect({
  width: 150,
  style: {
    ...DEFAULT_ICON_STYLE,
    transform: "translateY(0.2rem)",
  },
  rx: 30,
  ry: 30,
});

const HEAD_ICON = SVG.rect({
  style: {
    ...DEFAULT_ICON_STYLE,
    transform: "translateY(0.1rem)",
  },
  stroke: "currentColor",
  strokeWidth: 20,
  fillOpacity: 0.3,
});

const TAPE = SVG.tape({
  style: {
    ...DEFAULT_ICON_STYLE,
    width: "2.25rem",
    height: "0.75rem",
    transform: "translateY(0.05rem)",
  },
});

const GRID = SVG.grid({
  style: {
    ...DEFAULT_ICON_STYLE,
    transform: "translateY(0.1rem)",
  },
});

interface Extras {
  text?: string;
  icon?: Element | string;
}

const MEDIA_ICON_STYLE: Partial<CSSStyleDeclaration> = {
  backgroundColor: "#cccccc",
  borderRadius: "30%/50%",
  minWidth: "2em",
  textAlign: "center",
  marginRight: "0.2rem",
};

const STYLES: [string[], Partial<CSSStyleDeclaration & Extras>][] = [
  [
    ["state", "states", "m-configuration"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: ROUNDED_RECT,
      color: findContrastingColor(STATE).hex(),
    },
  ],
  [
    ["value"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: ROUNDED_RECT,
      color: findContrastingColor(VALUE).hex(),
    },
  ],
  [
    ["instruction"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: ROUNDED_RECT,
      color: findContrastingColor(INSTRUCTION.alpha(1)).hex(),
    },
  ],
  [
    ["head"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: HEAD_ICON,
      color: findContrastingColor(HEAD).hex(),
    },
  ],
  [
    ["tape"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: TAPE,
    },
  ],
  [
    ["program"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: GRID,
    },
  ],
  [
    ["jumps", "jump"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: span({ text: "↪\uFE0E", style: { fontFamily: "Fira Code" } }),
      fontWeight: "normal",
    },
  ],
  [
    ["blank"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: span({ text: "␣\uFE0E", style: { fontFamily: "Fira Code" } }),
      fontWeight: "normal",
    },
  ],
  [
    ["play"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: span({
        text: "⏵\uFE0E",
        role: "img",
        ariaLabel: "Play",
        style: MEDIA_ICON_STYLE,
      }),
      fontWeight: "normal",
    },
  ],
  [
    ["pause"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: span({
        text: "⏸\uFE0E",
        role: "img",
        ariaLabel: "Pause",
        style: MEDIA_ICON_STYLE,
      }),
      fontWeight: "normal",
    },
  ],
  [
    ["restart"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: span({
        text: "⏮\uFE0E",
        role: "img",
        ariaLabel: "Restart",
        style: MEDIA_ICON_STYLE,
      }),
      fontWeight: "normal",
    },
  ],
  [
    ["forwards", "forward"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: span({
        text: "⏵\uFE0E1",
        role: "img",
        ariaLabel: "Step",
        style: MEDIA_ICON_STYLE,
      }),
      fontWeight: "normal",
    },
  ],
  [
    ["backwards", "backward"],
    {
      ...DEFAULT_ELEM_STYLE,
      icon: span({
        text: "⏴\uFE0E1",
        role: "img",
        ariaLabel: "Step back",
        style: MEDIA_ICON_STYLE,
      }),
      fontWeight: "normal",
    },
  ],
];

const WORDS: Record<string, Partial<CSSStyleDeclaration & Extras>> = {};

for (const [words, style] of STYLES) {
  for (const word of words) {
    WORDS[word] = style;
  }
}

export class HighlightedWord extends HTMLParsedElement {
  static applyStyle(elem: HTMLElement) {
    const key = (
      elem.getAttribute("key") ||
      elem.attributes[0]?.name ||
      elem.innerHTML
    )
      .toLowerCase()
      .replace(/\n/g, " ");
    const style = WORDS[key];
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
    elem: HTMLElement | string,
  ): Partial<CSSStyleDeclaration> | undefined {
    const word = typeof elem === "string" ? elem : elem.innerText;
    return WORDS[word];
  }

  static parse(elem: HTMLElement) {
    elem.innerHTML = elem.innerHTML.replace(
      /\!([a-zA-Z\-]+)/g,
      (match, word) => {
        if (word === "important" || word === "--") {
          return `!${word}`;
        }
        return `<h->${word}</h->`;
      },
    );
  }

  async parsedCallback() {
    const self = this as unknown as HTMLElement;
    HighlightedWord.applyStyle(self);
  }
}
