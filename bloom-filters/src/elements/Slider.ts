import { input } from "../core/DOM";
import { attributeListener, customElement } from "../core/Decorators";
import { one } from "../core/Colors";

@customElement("s-slider")
export default class Slider extends HTMLElement {
  _style: HTMLStyleElement;
  _inner: HTMLInputElement;
  onChange: (e: Event) => void;

  constructor() {
    super();

    this._style = document.createElement("style");
    this._style.textContent = `
      :host {
        display: inline-block;
        width: 100%;
      }

      input {
        --c: ${one.toRgbaString()};
        --l: 4px;
        --h: 30px;
        --w: 30px;

        width: 100%;
        height: var(--h);
        -webkit-appearance :none;
        -moz-appearance :none;
        appearance :none;
        background: none;
        cursor: pointer;
        overflow: hidden;
      }
      input:focus-visible,
      input:hover{
        --p: 25%;
      }

      input[type="range" i]::-webkit-slider-thumb{
        height: var(--h);
        width: var(--w);
        aspect-ratio: 1;
        border-radius: 50%;
        background: var(--c);
        border-image: linear-gradient(90deg,var(--c) 50%,#ababab 0) 0 1/calc(50% - var(--l)/2) 100vw/0 100vw;
        -webkit-appearance: none;
        appearance: none;
        box-shadow: none;
        transition: .3s;
      }
      input[type="range"]::-moz-range-thumb {
        --h: 25px;
        --w: 25px;
        height: var(--h);
        width: var(--w);
        aspect-ratio: 1;
        border-radius: 50%;
        background: var(--c);
        border-image: linear-gradient(90deg,var(--c) 50%,#ababab 0) 0 1/calc(50% - var(--l)/2) 100vw/0 100vw;
        -webkit-appearance: none;
        appearance: none;
        box-shadow: none;
        transition: .3s;
      }
    `;

    this._inner = input({ type: "range" });
  }

  async connectedCallback() {
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(this._style);
    this.shadowRoot!.appendChild(this._inner);
    const onChange = this.getAttribute("onchange");
    if (onChange) {
      const f = new Function("e", onChange);
      this._inner.addEventListener("change", (e) => {
        f(e);
        e.preventDefault();
      });
      this._inner.addEventListener("input", (e) => {
        f(e);
        e.preventDefault();
      });
    }
  }

  addEventListener(type: any, listener: any, options?: any): void {
    this._inner.addEventListener(type, listener, options);
  }

  @attributeListener("value")
  valueChanged(value: string) {
    this._inner.value = value;
  }

  @attributeListener("min")
  minChanged(value: string) {
    this._inner.min = value;
  }

  @attributeListener("max")
  maxChanged(value: string) {
    this._inner.max = value;
  }

  @attributeListener("step")
  stepChanged(value: string) {
    this._inner.step = value;
  }

  get value() {
    return this._inner.value;
  }

  set value(value) {
    this._inner.value = value;
  }

  get min() {
    return this._inner.min;
  }

  set min(value) {
    this._inner.min = value;
  }

  get max() {
    return this._inner.max;
  }

  set max(value) {
    this._inner.max = value;
  }

  get step() {
    return this._inner.step;
  }

  set step(value) {
    this._inner.step = value;
  }
}
