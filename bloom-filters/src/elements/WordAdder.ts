import { button, div, style, textInput } from "../core/DOM";
import { customElement } from "../core/Decorators";
import { five, three, six } from "../core/Colors";
import BloomFilter from "./BloomFilter";

@customElement("s-word-adder")
export default class WordAdder extends HTMLElement {
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

        div {
          padding-top: 0.5em;
          padding-bottom: 0.5em;
          display: flex;
          justify-content: space-between;
          gap: 0.3em;
        }

        div input[type=text] {
          flex: 4 1 auto;
          min-width: 0;
          border-radius: 0.3em;
          border: 1px solid #aaaaaa;
          padding: 0.3em;
          height: 1.5rem;
          line-height: 1.5rem;
        }

        div button {
          flex: 1 1 auto;
          color: white;
          border: 0;
          border-radius: 0.3em;
          cursor: pointer;
        }

        div button.add {
          background-color: ${three.toRgbaString()};
        }

        div button.check {
          background-color: ${five.toRgbaString()};
        }

        div button.clear {
          background-color: ${six.toRgbaString()};
        }
    `)
    );

    let lastAction = "add";
    const text = textInput("Enter a value", {
      onChange: (e: Event) => {
        e.preventDefault();
        if (lastAction === "check") {
          bf.contains(text.value);
        } else {
          bf.add(text.value);
        }
      },
    });
    const controls = div(
      {},
      text,
      button({
        text: "Add",
        classes: ["add"],
        onClick: () => {
          bf.add(text.value);
          lastAction = "add";
        },
      }),
      button({
        text: "Check",
        classes: ["check"],
        onClick: () => {
          bf.contains(text.value);
          lastAction = "check";
        },
      }),
      button({
        text: "Clear",
        classes: ["clear"],
        onClick: () => bf.reset(),
      })
    );

    this.shadowRoot!.appendChild(controls);
  }
}
