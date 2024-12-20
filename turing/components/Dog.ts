// @ts-expect-error
import HTMLParsedElement from "html-parsed-element";
import { SVG } from "../core/SVG";
import { Tweens } from "../core/Tweens";
import { Easing, Tween } from "@tweenjs/tween.js";

interface Variant {
  image: string;
  alt: string;
  flip?: boolean;
}

const VARIANTS: Record<string, Record<string, Variant>> = {
  haskie: {
    default: {
      image: "/images/dogs/haskie/default.svg",
      alt: 'A picture of a cartoon husky puppy called "Haskie"',
    },
    bored: {
      image: "/images/dogs/haskie/bored.svg",
      alt: 'A picture of a cartoon husky puppy called "Haskie" looking bored.',
    },
    confused: {
      image: "/images/dogs/haskie/confused.svg",
      alt: 'A picture of a cartoon husky puppy called "Haskie" looking confused.',
    },
    concerned: {
      image: "/images/dogs/haskie/concerned.svg",
      alt: 'A picture of a husky dog called "Haskie", with a concerned facial expression',
    },
    triumphant: {
      image: "/images/dogs/haskie/triumphant.svg",
      alt: 'A picture of a husky dog called "Haskie", looking triumphant',
    },
  },
  sage: {
    caution: {
      image: "/images/dogs/sage/caution.svg",
      alt: "A picture of an old husky dog, with a concerned facial expression",
    },
    proud: {
      image: "/images/dogs/sage/proud.svg",
      alt: "A picture of an old husky dog, with a proud facial expression",
    },
    default: {
      image: "/images/dogs/sage/default.svg",
      alt: "A picture of an old husky dog",
    },
    despair: {
      image: "/images/dogs/sage/despair.svg",
      alt: "A picture of an old husky dog, with a despairing facial expression",
    },
  },
  doe: {
    default: {
      image: "/images/dogs/doe/default.svg",
      alt: 'A picture of a cartoon husky called "Doe"',
    },
    amazed: {
      image: "/images/dogs/doe/amazed.svg",
      alt: 'A picture of a cartoon husky called "Doe" looking amazed.',
    },
    mischief: {
      image: "/images/dogs/doe/mischief.svg",
      alt: 'A picture of a cartoon husky called "Doe" looking mischievous.',
    },
    protective: {
      image: "/images/dogs/doe/protective.svg",
      alt: 'A picture of a cartoon husky called "Doe" looking protective.',
    },
    proud: {
      image: "/images/dogs/doe/proud.svg",
      alt: 'A picture of a cartoon husky called "Doe" looking proud.',
    },
  },
  sam: {
    default: {
      image: "/images/samwho-2018-profile-14-transparent-200px.png",
      alt: "A vector-art picture of a cartoon character representing the author",
      flip: true,
    },
  },
};

export default class Dog extends HTMLParsedElement {
  _style: CSSStyleSheet;
  _elem: HTMLQuoteElement;
  _content: HTMLParagraphElement;

  get name(): string {
    // @ts-expect-error
    return this.getAttribute("name") || "haskie";
  }

  get default(): Variant {
    // @ts-expect-error
    return VARIANTS[this.name].default;
  }

  get mode(): string {
    // @ts-expect-error
    return this.getAttribute("mode") || "default";
  }

  get variant(): Variant {
    // @ts-expect-error
    return VARIANTS[this.name][this.mode];
  }

  async parsedCallback() {
    const self = this as unknown as HTMLElement;
    const content = self.innerHTML;
    self.innerHTML = "";

    self.classList.add("dog");

    const position =
      self.getAttribute("position") === "right" ? "right" : "left";
    self.classList.add(position);

    const variant = this.variant;

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
    img.style.cursor = "grab";
    img.style.width = "100px";
    img.style.height = "150px";
    img.style.minWidth = "100px";

    this._content = document.createElement("p");

    if (position === "right") {
      this._elem.appendChild(this._content);
      this._elem.appendChild(img);
    } else {
      this._elem.appendChild(img);
      this._elem.appendChild(this._content);
    }
    self.appendChild(this._elem);
    this._content.innerHTML = content;

    img.addEventListener("click", async (e) => {
      let { x, y, width, height } = getContentBox(img);
      height /= 2;

      function randomPoint() {
        return {
          x: Math.random() * width + x,
          y: Math.random() * height + y,
        };
      }

      const promises: Promise<Tween>[] = [];
      const hearts: SVGElement[] = [];
      for (let i = 0; i < 4; i++) {
        const { x, y } = randomPoint();
        const heart = SVG.heart({
          width: 20,
          height: 20,
          style: { color: "red", pointerEvents: "none" },
        });
        heart.style.position = "absolute";
        heart.style.top = `${y}px`;
        heart.style.left = `${x}px`;
        document.body.appendChild(heart);

        img.src = this.default.image;

        const promise = Tweens.play(
          new Tween({ y, opacity: 1 })
            .to({ y: y - 30, opacity: 0 })
            .duration(2000)
            .easing(Easing.Circular.Out)
            .onUpdate((v) => {
              heart.style.top = `${v.y}px`;
              heart.style.opacity = `${v.opacity}`;
            }),
        );

        promises.push(promise);
        hearts.push(heart);
      }

      await Promise.all(promises);
      for (const heart of hearts) {
        document.body.removeChild(heart);
      }

      img.src = variant.image;
    });
  }
}

function getContentBox(element: HTMLElement) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  const paddingX =
    Number.parseFloat(style.paddingLeft) +
    Number.parseFloat(style.paddingRight);
  const paddingY =
    Number.parseFloat(style.paddingTop) +
    Number.parseFloat(style.paddingBottom);
  const borderX =
    Number.parseFloat(style.borderLeftWidth) +
    Number.parseFloat(style.borderRightWidth);
  const borderY =
    Number.parseFloat(style.borderTopWidth) +
    Number.parseFloat(style.borderBottomWidth);

  const width = rect.width - paddingX - borderX;
  const height = rect.height - paddingY - borderY;

  return {
    x: rect.left + window.scrollX + Number.parseFloat(style.paddingLeft),
    y: rect.top + window.scrollY + Number.parseFloat(style.paddingTop),
    width: width,
    height: height,
  };
}
