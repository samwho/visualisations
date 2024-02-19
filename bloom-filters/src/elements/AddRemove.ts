import { button, form, style } from "../core/DOM";
import { customElement } from "../core/Decorators";
import { five, three, six } from "../core/Colors";
import BloomFilter from "./BloomFilter";

@customElement("s-add-remove")
export default class AddRemove extends HTMLElement {
  constructor() {
    super();
  }

  async connectedCallback() {
    document.addEventListener("DOMContentLoaded", (e) => {
      this.init();
    });
  }

  async init() {
    const id = this.getAttribute("bfid");
    if (!id) {
      throw new Error("Missing id");
    }

    const elem = document.getElementById(id);
    if (!elem) {
      throw new Error(`No element with id ${id}`);
    }

    const bf = (elem as any).application as BloomFilter;
    if (!bf) {
      setTimeout(() => {
        this.init();
      }, 100);
      return;
    }

    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(
      style(`
        * {
          font-size: 14pt;
        }

        form {
          padding-top: 0.5em;
          padding-bottom: 0.5em;
          display: flex;
          justify-content: space-between;
          gap: 0.3em;
        }

        form input[type=text] {
          flex: 4 1 auto;
          min-width: 0;
          border-radius: 0.3em;
          border: 1px solid #aaaaaa;
          padding: 0.3em;
          height: 1.5rem;
          line-height: 1.5rem;
        }

        form button {
          flex: 1 1 auto;
          color: white;
          border: 0;
          border-radius: 0.3em;
          cursor: pointer;
          line-height: 1.5rem;
          padding: 0.3rem;
        }

        form button.add {
          background-color: ${three.toRgbaString()};
        }

        form button.check {
          background-color: ${five.toRgbaString()};
        }

        form button.clear {
          background-color: ${six.toRgbaString()};
        }
    `)
    );

    let buttons: HTMLButtonElement[] = [];
    for (const elem of this.querySelectorAll("add,remove,clear")) {
      if (elem.tagName === "ADD") {
        buttons.push(
          button({
            text: `+${elem.getAttribute("value")}`,
            classes: ["add"],
            onClick: () => bf.add(elem.getAttribute("value")!),
          })
        );
      }
      if (elem.tagName === "REMOVE") {
        buttons.push(
          button({
            text: `-${elem.getAttribute("value")}`,
            classes: ["clear"],
            onClick: () => bf.remove(elem.getAttribute("value")!),
          })
        );
      }
      if (elem.tagName === "CLEAR") {
        buttons.push(
          button({
            text: "Clear",
            classes: ["clear"],
            onClick: () => bf.reset(),
          })
        );
      }
    }

    const controls = form({}, ...buttons);
    this.shadowRoot!.appendChild(controls);
  }
}
