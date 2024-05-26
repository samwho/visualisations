import { Color } from "pixi.js-legacy";
import { findContrastingColor, getColor } from "../core/Colors";
import { customElement } from "../core/Decorators";
import HTMLParsedElement from "html-parsed-element";
import { isTouchDevice } from "../core/Accessibility";
import { SVG } from "../core/SVG";

const CLIENT = findContrastingColor(getColor(5)).toRgbaString();
const SERVER = "black";
const REQUEST = findContrastingColor(getColor(0)).toRgbaString();
const PRIORITY = findContrastingColor(getColor(3), {
  ratio: 4.5,
}).toRgbaString();
const DROP = findContrastingColor(new Color(0xff0000), {
  ratio: 4.5,
}).toRgbaString();
const HIGHLIGHT = findContrastingColor(getColor(2), {
  ratio: 4.5,
}).toRgbaString();

const DEFAULT_STYLE: Partial<CSSStyleDeclaration> = {
  width: "1rem",
  height: "1rem",
  display: "inline",
  marginRight: "0.2rem",
  verticalAlign: "middle",
  transform: "translateY(-1px)",
};

const CIRCLE = SVG.circle({ style: DEFAULT_STYLE });
const HOLLOW_CIRCLE = SVG.circle({
  filled: false,
  strokeWidth: 10,
  rx: 40,
  ry: 40,
  style: DEFAULT_STYLE,
});
const CIRCLE_STRIPES = SVG.stripedCircle({ style: DEFAULT_STYLE });
const ROUNDED_SQUARE = SVG.roundedSquare({ style: DEFAULT_STYLE });
const QUEUE = SVG.queue({ style: { ...DEFAULT_STYLE, width: "2rem" } });
const TRIANGLE = SVG.triangle({ style: DEFAULT_STYLE });
const SQUARE = SVG.square({ style: DEFAULT_STYLE });
const DIAMOND = SVG.diamond({ style: DEFAULT_STYLE });

interface Extras {
  text?: string;
  icon?: SVGElement;
}

const STYLES: [string[], Partial<CSSStyleDeclaration & Extras>][] = [
  [
    ["queue", "queues", "queued"],
    {
      icon: QUEUE,
      fontWeight: "bold",
      color: "#666666",
      whiteSpace: "nowrap",
    },
  ],
  [
    ["priority queue", "priority requests", "priority request"],
    {
      color: PRIORITY,
      fontWeight: "bold",
      icon: CIRCLE_STRIPES,
      whiteSpace: "nowrap",
    },
  ],
  [
    ["request", "requests"],
    {
      icon: CIRCLE,
      color: REQUEST,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [
    ["server", "servers"],
    {
      color: SERVER,
      icon: ROUNDED_SQUARE,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [["client", "clients"], { color: CLIENT, fontWeight: "bold" }],
  [
    ["drop", "dropped", "dropping"],
    { color: DROP, icon: CIRCLE, fontWeight: "bold", whiteSpace: "nowrap" },
  ],
  [
    ["drop priority requests"],
    {
      color: DROP,
      icon: CIRCLE_STRIPES,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [["highlighted"], { color: HIGHLIGHT, icon: CIRCLE, fontWeight: "bold" }],
  [
    ["hollow", "time out", "timing out", "timed out", "timed out request"],
    {
      color: REQUEST,
      icon: HOLLOW_CIRCLE,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [["click"], { text: isTouchDevice() ? "tap" : "click" }],
  [["clicked"], { text: isTouchDevice() ? "tapped" : "clicked" }],
  [["clicking"], { text: isTouchDevice() ? "tapping" : "clicking" }],
  [
    ["button"],
    {
      color: REQUEST,
      icon: CIRCLE,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [
    ["fifo"],
    {
      color: findContrastingColor(getColor(2)).toRgbaString(),
      icon: CIRCLE,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [
    ["lifo"],
    {
      color: findContrastingColor(getColor(3)).toRgbaString(),
      icon: TRIANGLE,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [
    ["priority"],
    {
      color: findContrastingColor(getColor(4)).toRgbaString(),
      icon: SQUARE,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
  [
    ["priority with red", "priority+red"],
    {
      color: findContrastingColor(getColor(5)).toRgbaString(),
      icon: DIAMOND,
      fontWeight: "bold",
      whiteSpace: "nowrap",
    },
  ],
];

const WORDS: Record<string, Partial<CSSStyleDeclaration & Extras>> = {};

for (const [words, style] of STYLES) {
  for (const word of words) {
    WORDS[word] = style;
  }
}

@customElement("s-word")
export default class HighlightedWord extends HTMLParsedElement {
  static applyStyle(elem: HTMLElement) {
    const noIcon = elem.getAttribute("no-icon") !== null;
    const key = (elem.getAttribute("key") || elem.innerHTML)
      .toLowerCase()
      .replace(/\n/g, " ");
    const style = WORDS[key];
    if (style) {
      Object.assign(elem.style, style);
      if (style.text) {
        if (elem.innerHTML[0] === elem.innerHTML[0].toUpperCase()) {
          elem.innerHTML = style.text[0].toUpperCase() + style.text.slice(1);
        } else {
          elem.innerHTML = style.text;
        }
      }
    }
    if (style?.icon && !noIcon) {
      elem.prepend(style.icon.cloneNode(true));
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
