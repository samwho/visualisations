import { Application } from "./Application";
import { _attributeChangedCallback } from "./Decorators";

export abstract class CustomElement extends HTMLElement {
  static elementName: string;
  static observedAttributes: string[] = [];

  private _initCallbacks: ((app: Application) => void)[] = [];

  application: Application;

  abstract initApplication(elem: HTMLElement): Application;

  constructor() {
    super();

    for (const [key, value] of Object.entries(this.defaultStyle())) {
      this.style[key] = value;
    }

    for (const klass of this.defaultClasses()) {
      this.classList.add(klass);
    }
  }

  defaultStyle(): Partial<CSSStyleDeclaration> {
    return {
      display: "block",
      width: "100%",
      lineHeight: "0",
      aspectRatio: "2 / 1",
      backgroundColor: "white",
    };
  }

  onInit(callback: (app: Application) => void) {
    if (this.application) {
      callback(this.application);
    } else {
      this._initCallbacks.push(callback);
    }
  }

  defaultClasses(): string[] {
    return ["brand-shadow"];
  }

  connectedCallback() {
    this.application = this.initApplication(this);
    for (const callback of this._initCallbacks) {
      callback(this.application);
    }
    this._initCallbacks = [];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    _attributeChangedCallback(this.application, name, oldValue, newValue);
  }

  disconnectedCallback() {
    this.application?.destroy();
  }
}
