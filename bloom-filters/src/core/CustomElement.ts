import Application from "./Application";
import { _attributeChangedCallback } from "./Decorators";
import HTMLParsedElement from "html-parsed-element";

export default class PixiElement extends HTMLParsedElement {
  static elementName: string;
  static observedAttributes: string[] = [];

  application: Application;
  _container: HTMLElement;

  async initApplication(
    root: HTMLElement,
    container: HTMLElement
  ): Promise<Application> {
    throw new Error("Not implemented");
  }

  async preApplicationInit() {}
  async postApplicationInit() {}

  async parsedCallback() {
    this.attachShadow({ mode: "open" });
    this.shadowRoot!.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    flex-wrap: nowrap;
                    align-items: stretch;
                    align-content: stretch;
                    width: 100%;
                    line-height: 0;
                    user-select: none;
                    padding-bottom: 1rem;
                }
            </style>
        `;

    await this.preApplicationInit();

    this._container = document.createElement("div");
    this.shadowRoot!.appendChild(this._container);

    this._container.style.width = "100%";
    this._container.style.height = this.getAttribute("height") || "100px";
    this._container.style.flexGrow = "1";
    this._container.style.flexShrink = "1";

    // @ts-ignore
    this.application = await this.initApplication(this, this._container);
    if (this.getAttribute("pixidebug") !== null) {
      globalThis.__PIXI_APP__ = this.application;
    }
    await this.postApplicationInit();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    _attributeChangedCallback(this.application, name, oldValue, newValue);
  }

  disconnectedCallback() {
    this.application.destroy();
  }
}
