import { customElement } from "../core/Decorators";
import HTMLParsedElement from "html-parsed-element";

@customElement("s-dog")
export default class Dog extends HTMLParsedElement {
  _style: CSSStyleSheet;
  _elem: HTMLQuoteElement;
  _content: HTMLParagraphElement;

  static variants = {
    haskie: {
      confused: {
        image: "/images/haskie-confused.png",
        alt: 'A picture of a husky dog called "Haskie", with a confused facial expression',
      },
      asleep: {
        image: "/images/haskie-asleep.png",
        alt: 'A picture of a husky dog called "Haskie", sleeping',
      },
      concerned: {
        image: "/images/haskie-concerned.png",
        alt: 'A picture of a husky dog called "Haskie", with a concerned facial expression',
      },
      triumphant: {
        image: "/images/haskie-triumphant.png",
        alt: 'A picture of a husky dog called "Haskie", looking triumphant',
      },
    },
    sage: {
      warning: {
        image: "/images/sage-warning.png",
        alt: "A picture of an old husky dog, with a concerned facial expression",
        flip: true,
      },
      happy: {
        image: "/images/sage-happy.png",
        alt: "A picture of an old husky dog, with a happy facial expression",
      },
    },
    sam: {
      default: {
        image: "/images/samwho-2018-profile-14-transparent.png",
        alt: "A vector-art picture of a cartoon character representing the author",
        flip: true,
      },
    },
  };

  constructor() {
    super();
    this._style = new CSSStyleSheet();
    this._style.replaceSync(`
      blockquote {
        background: none;
        padding: 1rem 0 1rem 0;
        border: none;
        margin: 0 0 0 0;
        display: flex;
        align-items: center;
      }

      img {
        width: 100px;
        max-width: 100px;
        margin: 0 1rem 0 0;
      }

      p {
        background-color: #eceff4;
        padding: 1rem;
        border-radius: 1rem;
        position: relative;
      }

      p::after {
        content: "";
        border: 15px solid transparent;
        position: absolute;
        border-right-color: #eceff4;
        border-left: 0;
        left: -15px;
        top: 50%;
        margin-top: -15px;
      }

      a {
        color: #4ba69d;
        text-decoration: none;
        cursor: pointer;
      }

      a:visited {
        color: #007070;
      }

      a:hover {
        text-decoration: underline;
      }

      a.anchor {
        color: #d08770;
      }
    `);
  }

  async parsedCallback() {
    const self = this as unknown as HTMLElement;
    self.attachShadow({ mode: "open" });
    self.shadowRoot!.adoptedStyleSheets = [this._style];

    const name = self.getAttribute("name") || "haskie";
    const mode =
      self.getAttribute("mode") || Object.keys(Dog.variants[name])[0];
    const variant = Dog.variants[name][mode];

    this._elem = document.createElement("blockquote");
    if (self.getAttribute("padding") === "false") {
      this._elem.style.padding = "0";
    }
    const img = document.createElement("img");
    img.src = variant.image;
    if (variant.flip) {
      img.style.transform = "scaleX(-1)";
    }
    img.alt = variant.alt;
    this._content = document.createElement("p");

    this._elem.appendChild(img);
    this._elem.appendChild(this._content);
    self.shadowRoot!.appendChild(this._elem);
    this._content.innerHTML = self.innerHTML;
  }
}
