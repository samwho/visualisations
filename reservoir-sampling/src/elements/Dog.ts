import { BaseElement } from "../core/BaseElement";
import { div } from "../core/DOM";
import { SVG } from "../core/SVG";
import { randBetween } from "../core/Utils";

interface Variant {
  image: string;
  alt: Record<string, string>;
  flip?: boolean;
}

const VARIANTS: Record<string, Record<string, Variant>> = {
  haskie: {
    default: {
      image: "/images/dogs/haskie/default.svg",
      alt: {
        en: 'A picture of a cartoon husky puppy called "Haskie"',
      },
    },
    bored: {
      image: "/images/dogs/haskie/bored.svg",
      alt: {
        en: 'A picture of a cartoon husky puppy called "Haskie" looking bored.',
      },
    },
    confused: {
      image: "/images/dogs/haskie/confused.svg",
      alt: {
        en: 'A picture of a cartoon husky puppy called "Haskie" looking confused.',
        es: 'Un dibujo animado de un cachorro de husky llamado "Haskie" con cara de confusión.',
      },
    },
    concerned: {
      image: "/images/dogs/haskie/concerned.svg",
      alt: {
        en: 'A picture of a husky dog called "Haskie", with a concerned facial expression',
        es: 'Una foto de un perro husky llamado "Haskie", con una expresión facial de preocupación',
      },
    },
    triumphant: {
      image: "/images/dogs/haskie/triumphant.svg",
      alt: {
        en: 'A picture of a husky dog called "Haskie", looking triumphant',
      },
    },
  },
  sage: {
    caution: {
      image: "/images/dogs/sage/caution.svg",
      alt: {
        en: "A picture of an old husky dog, with a concerned facial expression",
      },
    },
    proud: {
      image: "/images/dogs/sage/proud.svg",
      alt: {
        en: "A picture of an old husky dog, with a proud facial expression",
      },
    },
    default: {
      image: "/images/dogs/sage/default.svg",
      alt: {
        en: "A picture of an old husky dog",
        es: "La imagen de un viejo perro husky",
      },
    },
    despair: {
      image: "/images/dogs/sage/despair.svg",
      alt: {
        en: "A picture of an old husky dog, with a despairing facial expression",
      },
    },
  },
  doe: {
    default: {
      image: "/images/dogs/doe/default.svg",
      alt: {
        en: 'A picture of a cartoon husky called "Doe"',
      },
    },
    amazed: {
      image: "/images/dogs/doe/amazed.svg",
      alt: {
        en: 'A picture of a cartoon husky called "Doe" looking amazed.',
      },
    },
    mischief: {
      image: "/images/dogs/doe/mischief.svg",
      alt: {
        en: 'A picture of a cartoon husky called "Doe" looking mischievous.',
      },
    },
    protective: {
      image: "/images/dogs/doe/protective.svg",
      alt: {
        en: 'A picture of a cartoon husky called "Doe" looking protective.',
      },
    },
    proud: {
      image: "/images/dogs/doe/proud.svg",
      alt: {
        en: 'A picture of a cartoon husky called "Doe" looking proud.',
      },
    },
  },
  sam: {
    default: {
      image: "/images/samwho-2018-profile-14-transparent-200px.png",
      alt: {
        en: "A vector-art picture of a cartoon character representing the author",
      },
      flip: true,
    },
  },
};

export default class Dog extends BaseElement {
  _style: CSSStyleSheet;
  _elem: HTMLQuoteElement;
  _content: HTMLParagraphElement;

  get name(): string {
    return this.getAttribute("name") || "haskie";
  }

  get default(): Variant {
    return VARIANTS[this.name].default;
  }

  get mode(): string {
    return this.getAttribute("mode") || "default";
  }

  get variant(): Variant {
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

    const lang = self.getAttribute("lang") || "en";

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
    img.alt = variant.alt[lang] || variant.alt["en"]!;
    img.style.cursor = "grab";
    img.style.width = "100px";
    img.style.height = "180px";
    img.style.minWidth = "100px";
    img.draggable = false;

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
      function randomPoint() {
        return {
          x: e.pageX + randBetween(-40, 40),
          y: e.pageY + randBetween(-20, 20),
        };
      }

      const heartWidth = 20;
      const heartHeight = 20;
      for (let i = 0; i < 4; i++) {
        const { x, y } = randomPoint();
        const heart = SVG.heart({
          width: heartWidth,
          height: heartHeight,
          style: {
            color: "red",
            pointerEvents: "none",
            position: "absolute",
            top: "0px",
            left: "0px",
            opacity: "0",
            transform: `translate(${x}px, ${y}px)`,
          },
        });
        document.body.appendChild(heart);

        heart
          .animate(
            [{ transform: `translate(${x}px, ${y - 30}px)`, opacity: 1 }],
            {
              easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              duration: 1000,
            }
          )
          .finished.then((a) => {
            document.body.removeChild(heart);

            for (let i = 0; i < 10; i++) {
              const baseTransform = `translate(${x}px, ${y - 30}px) rotate(${
                i * 36
              }deg)`;

              const line = div({
                style: {
                  width: "1px",
                  height: "5px",
                  position: "absolute",
                  pointerEvents: "none",
                  backgroundColor: "red",
                  top: `${heartHeight / 2}px`,
                  left: `${heartWidth / 2}px`,
                  transform: baseTransform,
                },
              });
              document.body.appendChild(line);

              line
                .animate(
                  [
                    {
                      transform: `${baseTransform} translate(0px, -20px)`,
                      opacity: 0,
                    },
                  ],
                  {
                    easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                    duration: 1000,
                  }
                )
                .finished.then((a) => {
                  document.body.removeChild(line);
                });
            }
          });
      }
    });
  }
}
